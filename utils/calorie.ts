export type Sex = 'male' | 'female';
export type ActivityLevel = 'inactive' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active';
export type BodyGoal = 'lose-weight' | 'slightly-lose-weight' | 'maintain-weight' | 'slightly-gain-weight' | 'gain-weight';

export interface CalorieInputs {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  bodyGoal: BodyGoal;
}

export interface CalorieTargets {
  bmr: number;
  tdee: number;
  targetCalories: number;
  activityFactor: number;
  goalAdjustment: number;
}

export function calculateBMR({ heightCm, weightKg, age, sex }: { heightCm: number; weightKg: number; age: number; sex: Sex }): number {
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (sex === 'male' ? 5 : -161);
  return roundTo(bmr, 1);
}

export function getActivityFactor(level: ActivityLevel): number {
  switch (level) {
    case 'inactive':
      return 1.2;
    case 'lightly-active':
      return 1.375;
    case 'moderately-active':
      return 1.55;
    case 'very-active':
      return 1.725;
    case 'extremely-active':
      return 1.9;
    default:
      return 1.2;
  }
}

export function adjustForGoal(tdee: number, goal: BodyGoal): { targetCalories: number; goalAdjustment: number } {
  let adj = 0;
  if (goal === 'lose-weight') adj = -500;
  else if (goal === 'gain-weight') adj = 500;
  else if (goal === 'slightly-lose-weight') adj = -250;
  else if (goal === 'slightly-gain-weight') adj = 250;
  else adj = 0; // maintain-weight

  const target = tdee + adj;
  return { targetCalories: roundTo(target, 0), goalAdjustment: adj };
}

export function calculateCalorieTargets(inputs: CalorieInputs): CalorieTargets {
  const bmr = calculateBMR(inputs);
  const activityFactor = getActivityFactor(inputs.activityLevel);
  const tdee = roundTo(bmr * activityFactor, 0);
  const { targetCalories, goalAdjustment } = adjustForGoal(tdee, inputs.bodyGoal);
  return { bmr, tdee, targetCalories, activityFactor, goalAdjustment };
}

function roundTo(n: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}
