import { supabase } from '../lib/supabase';

export interface QcmQuestion {
  prompt: string;
  choices: string[];
  correct: number;
}

export interface TfStatement {
  text: string;
  correct: boolean;
}

export type Level10Question =
  | { format: 'qcm'; prompt: string; choices: string[]; correct: number }
  | { format: 'tf'; prompt: string; correct: boolean };

export interface QuizCategory {
  key: string;
  label: string;
  icon: string;
  questions: QcmQuestion[];
}

interface QuestionRow {
  category_id: number | null;
  format: 'qcm' | 'tf';
  prompt: string;
  choices: string[] | null;
  correct_index: number | null;
  correct_bool: boolean | null;
  order_index: number;
}

async function fetchRows(levelN: number): Promise<QuestionRow[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('category_id, format, prompt, choices, correct_index, correct_bool, order_index')
    .eq('level_n', levelN)
    .order('order_index');
  if (error) throw error;
  return data ?? [];
}

export async function fetchFlatQuestions(levelN: number): Promise<QcmQuestion[]> {
  const rows = await fetchRows(levelN);
  return rows.map((r) => ({ prompt: r.prompt, choices: r.choices!, correct: r.correct_index! }));
}

export async function fetchTfStatements(levelN: number): Promise<TfStatement[]> {
  const rows = await fetchRows(levelN);
  return rows.map((r) => ({ text: r.prompt, correct: r.correct_bool! }));
}

export async function fetchMixedQuestions(levelN: number): Promise<Level10Question[]> {
  const rows = await fetchRows(levelN);
  return rows.map((r) =>
    r.format === 'qcm'
      ? { format: 'qcm', prompt: r.prompt, choices: r.choices!, correct: r.correct_index! }
      : { format: 'tf', prompt: r.prompt, correct: r.correct_bool! },
  );
}

export async function fetchCategories(levelN: number): Promise<QuizCategory[]> {
  const [{ data: categories, error: catError }, rows] = await Promise.all([
    supabase.from('quiz_categories').select('id, key, label, icon, order_index').eq('level_n', levelN).order('order_index'),
    fetchRows(levelN),
  ]);
  if (catError) throw catError;

  return (categories ?? []).map((c) => ({
    key: c.key,
    label: c.label,
    icon: c.icon,
    questions: rows
      .filter((r) => r.category_id === c.id)
      .map((r) => ({ prompt: r.prompt, choices: r.choices!, correct: r.correct_index! })),
  }));
}
