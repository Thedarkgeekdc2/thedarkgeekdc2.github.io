
const SESSION_KEY='flashcardChampAdmin';
const DEFAULT_SESSION_MINUTES=60;

export function isAdminSessionValid(){
  try{
    const raw=localStorage.getItem(SESSION_KEY);
    if(!raw)return false;
    const s=JSON.parse(raw);
    const created=Number(s.loginAt||0);
    const minutes=Number(s.timeoutMinutes||DEFAULT_SESSION_MINUTES);
    const age=Date.now()-created;
    return Number.isFinite(age) && age>=0 && age<=minutes*60*1000;
  }catch{return false;}
}

export async function login(username,password){
  let expectedUser='admin',expectedPass='flashcard123',timeoutMinutes=DEFAULT_SESSION_MINUTES;
  try{
    const r=await fetch('../config/admin-config.json',{cache:'no-store'});
    if(r.ok){
      const c=await r.json();
      expectedUser=String(c.adminUsername||expectedUser);
      expectedPass=String(c.adminPassword||expectedPass);
      timeoutMinutes=Number(c.sessionTimeoutMinutes||DEFAULT_SESSION_MINUTES);
    }
  }catch{}
  if(String(username).trim()===expectedUser && String(password)===expectedPass){
    localStorage.setItem(SESSION_KEY,JSON.stringify({
      loginAt:Date.now(),timeoutMinutes
    }));
    return true;
  }
  return false;
}

export function logout(){localStorage.removeItem(SESSION_KEY);}
export function requireAdmin(){
  if(isAdminSessionValid()) return true;
  location.replace('login.html');
  return false;
}

/*
 * This helper is safe for inline scripts on admin pages.
 * It intentionally uses the same localStorage session key.
 */
export function requireAdminSync(){
  if(isAdminSessionValid()) return true;
  location.replace('login.html');
  return false;
}
