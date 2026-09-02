const IMAGE_EXTENSIONS = ['png','jpg','jpeg','webp','gif','svg'];

export function getImageExtension(path='') {
  const clean = String(path).split('?')[0].split('#')[0];
  const ext = clean.includes('.') ? clean.split('.').pop().toLowerCase() : '';
  return ext;
}

export function isSupportedImage(path='') {
  return IMAGE_EXTENSIONS.includes(getImageExtension(path));
}

export function preloadImage(path) {
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error(`Image could not be loaded: ${path}`));
    img.src=path;
  });
}

export async function validateImagePath(path) {
  if(!path || !isSupportedImage(path)) return {ok:false, reason:'Unsupported or missing image path'};
  try {
    const img = await preloadImage(path);
    return {ok:true, width:img.naturalWidth, height:img.naturalHeight};
  } catch (e) {
    return {ok:false, reason:e.message};
  }
}
