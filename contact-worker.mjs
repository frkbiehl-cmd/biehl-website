const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return json({error:'method'},405);
    if (request.headers.get('Origin') !== url.origin) return json({error:'origin'},403);
    if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json({error:'type'},415);
    if (!env.CONTACT_EMAIL || !env.CONTACT_TO || !env.CONTACT_FROM || !env.CONTACT_RATE_LIMITER) return json({error:'unavailable'},503);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rate = await env.CONTACT_RATE_LIMITER.limit({key:'contact:'+ip});
    if (!rate.success) return json({error:'rate'},429);
    if (Number(request.headers.get('Content-Length') || 0) > 16000) return json({error:'size'},413);
    let data;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({error:'invalid'},400);
      const parts=[];let size=0;
      for (;;) { const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();return json({error:'size'},413);}parts.push(value); }
      const body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.byteLength;}
      data=JSON.parse(new TextDecoder().decode(body));
    } catch {return json({error:'invalid'},400);}
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json({error:'invalid'},400);
    if (data.website) return json({error:'invalid'},400);
    const name=typeof data.name==='string'?data.name.trim():'';
    const email=typeof data.email==='string'?data.email.trim():'';
    const message=typeof data.message==='string'?data.message.trim():'';
    if (!name || name.length>100 || /[\r\n]/.test(name) || email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || message.length<10 || message.length>5000) return json({error:'invalid'},400);
    try {
      await env.CONTACT_EMAIL.send({
        from:{email:env.CONTACT_FROM,name:'Biehl Digital Studio'},to:env.CONTACT_TO,replyTo:email,
        subject:'New enquiry from the Biehl website',
        text:`Name: ${name}\nEmail: ${email}\nLanguage: ${data.language==='da'?'Danish':'English'}\n\n${message}`
      });
      return json({ok:true});
    } catch {return json({error:'delivery'},502);}
  }
};
