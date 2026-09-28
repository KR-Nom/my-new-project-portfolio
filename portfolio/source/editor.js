let selectedImage=null;let editable=document.body.contentEditable!=='false';const $=s=>document.querySelector(s);
function fit(){document.documentElement.style.setProperty('--scale',Math.min(1,(innerWidth-(innerWidth<=800?24:262))/1920))}fit();addEventListener('resize',fit);
function toast(message){$('.toast').textContent=message;$('.toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('.toast').hidden=true,3500)}
document.body.classList.toggle('editing',editable);
$('#edit-toggle').onclick=()=>{editable=!editable;document.body.contentEditable=String(editable);document.querySelectorAll('.slide').forEach(s=>s.contentEditable=String(editable));document.body.classList.toggle('editing',editable);$('#edit-toggle').textContent=editable?'편집 켜짐':'편집 꺼짐'};
function clear(){document.querySelectorAll('.selected-image').forEach(i=>i.classList.remove('selected-image'))}
document.addEventListener('click',e=>{if(e.target.matches('.slide img')){clear();selectedImage=e.target;selectedImage.classList.add('selected-image');$('#image-size').value=Number(selectedImage.dataset.scale||100)}else if(!e.target.closest('.toolbar')){clear();selectedImage=null}});
$('#image-size').oninput=e=>{if(selectedImage){selectedImage.dataset.scale=e.target.value;selectedImage.style.transform=`scale(${Number(e.target.value)/100})`}};
function replace(file){if(!file?.type.startsWith('image/')||!selectedImage)return;const img=selectedImage,reader=new FileReader();reader.onload=()=>{img.src=reader.result;img.dataset.scale='100';img.style.transform='';$('#image-size').value=100;toast('이미지를 교체했습니다. 편집본 저장으로 보관하세요.')};reader.readAsDataURL(file)}
$('#replace-image').onclick=()=>selectedImage?$('#image-upload').click():toast('먼저 이미지를 클릭해 주세요.');$('#image-upload').onchange=e=>replace(e.target.files[0]);
document.addEventListener('paste',e=>{const img=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));if(img&&selectedImage){e.preventDefault();replace(img.getAsFile())}});
$('#save-html').onclick=()=>{clear();const doc=document.documentElement.cloneNode(true);doc.querySelector('.toast').hidden=true;const url=URL.createObjectURL(new Blob(['<!doctype html>\n'+doc.outerHTML],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='장현진_포트폴리오.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('수정 내용과 이미지를 포함해 저장했습니다.')};
$('#print').onclick=()=>{clear();window.print()};addEventListener('beforeprint',clear);
document.addEventListener('input',e=>{if(e.target.closest('.slide'))$('.save-status').textContent='수정 후 편집본 저장'});
const observer=new IntersectionObserver(entries=>{const best=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(best)document.querySelectorAll('.outline a').forEach(a=>a.classList.toggle('active',a.hash==='#'+best.target.id))},{threshold:[.25,.6]});document.querySelectorAll('.sheet').forEach(s=>observer.observe(s));
