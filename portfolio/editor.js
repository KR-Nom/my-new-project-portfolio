let selectedImage = null;
let editable = document.body.contentEditable !== 'false';
const $ = s => document.querySelector(s);
function fitSlides(){const pad=innerWidth<=900?24:278;document.documentElement.style.setProperty('--scale',Math.min(1,(innerWidth-pad)/1600));}
fitSlides();addEventListener('resize',fitSlides);
function toast(message){const e=$('.toast');e.textContent=message;e.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.hidden=true,4000);}
document.body.classList.toggle('editing',editable);
$('#edit-toggle').textContent=editable?'편집 켜짐':'편집 꺼짐';
$('#edit-toggle').addEventListener('click',()=>{editable=!editable;document.body.contentEditable=String(editable);document.querySelectorAll('.slide').forEach(s=>s.contentEditable=String(editable));document.body.classList.toggle('editing',editable);$('#edit-toggle').textContent=editable?'편집 켜짐':'편집 꺼짐';toast(editable?'문장을 클릭하면 바로 수정할 수 있습니다.':'문서를 읽는 모드입니다.');});
function clearSelection(){document.querySelectorAll('.selected-image').forEach(e=>e.classList.remove('selected-image'));}
document.addEventListener('click',e=>{if(e.target.matches('.slide img')){clearSelection();selectedImage=e.target;selectedImage.classList.add('selected-image');$('#image-size').value=Number(selectedImage.dataset.scale||100);}else if(!e.target.closest('.toolbar')){clearSelection();selectedImage=null;}});
$('#image-size').addEventListener('input',e=>{if(!selectedImage)return;selectedImage.dataset.scale=e.target.value;selectedImage.style.transform=`scale(${e.target.value/100})`;selectedImage.style.transformOrigin='center';});
async function setImage(file){if(!file||!file.type.startsWith('image/'))return;if(!selectedImage){toast('먼저 교체할 이미지를 클릭해 주세요.');return;}const img=selectedImage;const reader=new FileReader();reader.onload=()=>{img.src=reader.result;img.alt='사용자가 교체한 프로젝트 이미지';img.dataset.scale='100';img.style.transform='';$('#image-size').value=100;toast('이미지를 교체했습니다. 편집본을 저장하면 유지됩니다.');};reader.readAsDataURL(file);}
$('#replace-image').addEventListener('click',()=>selectedImage?$('#image-upload').click():toast('먼저 교체할 이미지를 클릭해 주세요.'));
$('#image-upload').addEventListener('change',e=>setImage(e.target.files[0]));
document.addEventListener('paste',e=>{const image=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));if(image&&selectedImage){e.preventDefault();setImage(image.getAsFile());}});
$('#save-html').addEventListener('click',()=>{clearSelection();const clone=document.documentElement.cloneNode(true);clone.querySelector('.toast').hidden=true;clone.querySelector('.evidence-drawer').hidden=true;clone.querySelectorAll('.active').forEach(x=>x.classList.remove('active'));clone.querySelector('body').classList.remove('editing');const blob=new Blob(['<!doctype html>\n'+clone.outerHTML],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='장현진_포트폴리오.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('이미지와 수정 내용을 포함한 HTML을 저장했습니다.');});
$('#print').addEventListener('click',()=>{clearSelection();window.print();});
addEventListener('beforeprint',clearSelection);
$('#evidence-toggle').addEventListener('click',()=>$('.evidence-drawer').hidden=!$('.evidence-drawer').hidden);
$('#evidence-close').addEventListener('click',()=>$('.evidence-drawer').hidden=true);
const observer=new IntersectionObserver(entries=>{const best=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(best){document.querySelectorAll('.outline a').forEach(a=>a.classList.toggle('active',a.hash==='#'+best.target.id));}},{threshold:[.25,.6]});document.querySelectorAll('.sheet').forEach(s=>observer.observe(s));
document.addEventListener('input',e=>{if(e.target.closest('.slide'))$('.save-status').textContent='수정 후 편집본 저장';});
