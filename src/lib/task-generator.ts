// Task Generator - Creates age-appropriate daily tasks
import { v4 as uuidv4 } from 'uuid';
import { Task, AgeGroup, TaskCategory } from './types';

interface TaskTemplate {
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
}

const TASKS_BY_AGE_GROUP: Record<AgeGroup, TaskTemplate[]> = {
  '5-7': [
    { title: 'Coloring Time', description: 'Complete a coloring page with your favorite colors', category: 'creativity', points: 10 },
    { title: 'Reading with Parent', description: 'Read a story together with mom or dad for 15 minutes', category: 'reading', points: 15 },
    { title: 'Toy Cleanup', description: 'Put all your toys back in their places', category: 'chores', points: 10 },
    { title: 'Gratitude Drawing', description: 'Draw something you are thankful for today', category: 'kindness', points: 15 },
    { title: 'Brush Teeth', description: 'Brush your teeth for 2 minutes', category: 'chores', points: 5 },
    { title: 'Make Your Bed', description: 'Make your bed nice and neat', category: 'chores', points: 10 },
    { title: 'Help Set Table', description: 'Help put plates and cups on the table', category: 'chores', points: 10 },
    { title: 'Say Thank You', description: 'Say thank you to someone who helps you today', category: 'kindness', points: 10 },
    { title: 'Learn New Word', description: 'Learn one new word and use it in a sentence', category: 'learning', points: 15 },
    { title: 'Dance Party', description: 'Dance to your favorite song for 5 minutes', category: 'fitness', points: 10 },
  ],
  '8-11': [
    { title: 'Reading Time', description: 'Read a book for 20 minutes', category: 'reading', points: 20 },
    { title: 'Room Cleanup', description: 'Clean and organize your room', category: 'chores', points: 15 },
    { title: 'Writing Prompt', description: 'Write a short story or journal entry (5+ sentences)', category: 'creativity', points: 20 },
    { title: 'Kindness Challenge', description: 'Do something kind for a family member without being asked', category: 'kindness', points: 20 },
    { title: 'Math Practice', description: 'Complete 10 math problems', category: 'learning', points: 15 },
    { title: 'Help with Dishes', description: 'Help wash or dry the dishes after a meal', category: 'chores', points: 15 },
    { title: 'Exercise Time', description: 'Do 20 jumping jacks and 10 push-ups', category: 'fitness', points: 15 },
    { title: 'Learn Something New', description: 'Watch an educational video and share what you learned', category: 'learning', points: 20 },
    { title: 'Creative Project', description: 'Work on an art or craft project', category: 'creativity', points: 20 },
    { title: 'Help Sibling', description: 'Help your sibling with something they need', category: 'kindness', points: 15 },
  ],
  '12-14': [
    { title: 'Journaling', description: 'Write in your journal about your day and feelings', category: 'mindset', points: 25 },
    { title: 'Fitness Challenge', description: 'Complete a 15-minute workout routine', category: 'fitness', points: 25 },
    { title: 'Mindset Prompt', description: 'Write about a challenge you overcame and what you learned', category: 'mindset', points: 30 },
    { title: 'Focus Challenge', description: 'Work on homework for 30 minutes without distractions', category: 'learning', points: 30 },
    { title: 'Reading Goal', description: 'Read for 30 minutes', category: 'reading', points: 25 },
    { title: 'Household Chore', description: 'Complete a household chore (vacuum, laundry, etc.)', category: 'chores', points: 20 },
    { title: 'Goal Setting', description: 'Write down 3 goals for the week', category: 'goals', points: 25 },
    { title: 'Gratitude List', description: 'Write 5 things you are grateful for today', category: 'kindness', points: 20 },
    { title: 'Learn a Skill', description: 'Spend 20 minutes learning something new online', category: 'learning', points: 25 },
    { title: 'Help Others', description: 'Volunteer to help with a family task', category: 'kindness', points: 20 },
  ],
  '15-17': [
    { title: 'Goal Planning', description: 'Review and update your weekly/monthly goals', category: 'goals', points: 35 },
    { title: 'Budget Exercise', description: 'Track expenses or create a simple budget', category: 'entrepreneur', points: 40 },
    { title: 'Entrepreneur Challenge', description: 'Brainstorm a business idea and write a mini plan', category: 'entrepreneur', points: 45 },
    { title: 'Discipline Habit', description: 'Complete your morning routine before 8 AM', category: 'mindset', points: 30 },
    { title: 'Deep Work Session', description: 'Work on an important project for 45 minutes', category: 'learning', points: 40 },
    { title: 'Fitness Routine', description: 'Complete a 30-minute workout', category: 'fitness', points: 35 },
    { title: 'Reading Hour', description: 'Read a non-fiction book for 30+ minutes', category: 'reading', points: 35 },
    { title: 'Reflection Journal', description: 'Write about your progress toward your goals', category: 'mindset', points: 30 },
    { title: 'Skill Building', description: 'Practice a skill you want to improve', category: 'learning', points: 35 },
    { title: 'Network Challenge', description: 'Reach out to someone you admire and ask a question', category: 'entrepreneur', points: 40 },
  ],
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateDailyTasks(childId: string, ageGroup: AgeGroup, count: number = 5): Task[] {
  const templates = TASKS_BY_AGE_GROUP[ageGroup];
  const shuffled = shuffleArray(templates);
  const selected = shuffled.slice(0, count);
  const today = new Date().toISOString().split('T')[0];

  return selected.map((template) => ({
    id: uuidv4(),
    childId,
    title: template.title,
    description: template.description,
    category: template.category,
    points: template.points,
    status: 'pending' as const,
    dueDate: today,
    isCustom: false,
    ageGroup,
    requiresProof: false,
  }));
}

export function getTasksByCategory(ageGroup: AgeGroup, category: TaskCategory): TaskTemplate[] {
  return TASKS_BY_AGE_GROUP[ageGroup].filter((t) => t.category === category);
}

export function getAllTaskTemplates(ageGroup: AgeGroup): TaskTemplate[] {
  return TASKS_BY_AGE_GROUP[ageGroup];
}
