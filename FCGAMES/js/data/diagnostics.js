import { loadCatalog, loadAllQuestions } from './loader.js';

export async function getDataDiagnostics() {
  const catalog = await loadCatalog();
  const questions = await loadAllQuestions();
  const typeCounts = {};
  questions.forEach(q => typeCounts[q.type] = (typeCounts[q.type] || 0) + 1);
  return {
    topics: catalog.topics?.length || 0,
    questions: questions.length,
    questionTypes: typeCounts
  };
}
