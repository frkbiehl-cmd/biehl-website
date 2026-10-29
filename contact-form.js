for (const form of document.querySelectorAll('[data-contact-form]')) {
  const status=form.querySelector('[role="status"]');
  const button=form.querySelector('button[type="submit"]');
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if (!form.reportValidity()) return;
    const original=button.textContent;
    button.disabled=true;button.textContent=form.dataset.sending;status.textContent='';
    try {
      const fields=new FormData(form);
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fields.get('name'),email:fields.get('email'),message:fields.get('message'),website:fields.get('website'),language:document.documentElement.lang})});
      const result=await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'delivery');
      form.reset();status.textContent=form.dataset.success;
    } catch(error) { status.textContent=error.message==='rate'?form.dataset.rate:form.dataset.error; }
    finally {button.disabled=false;button.textContent=original;}
  });
}
