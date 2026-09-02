
import {getQuestions,setQuestions,upsertQuestion,removeQuestion} from './data-store.js';
export function getCustomQuestions(){return getQuestions();}
export function saveCustomQuestion(q){return upsertQuestion(q);}
export function updateCustomQuestion(q){return upsertQuestion(q);}
export function deleteCustomQuestion(id){removeQuestion(id);}
export function clearCustomQuestions(){setQuestions([]);}
