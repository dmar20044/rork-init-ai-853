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

// Step 1: Calculate BMR (Basal Metabolic Rate) using the Mifflin-St Jeor Equation
export function calculateBMR({ heightCm, weightKg, age, sex }: { heightCm: number; weightKg: number; age: number; sex: Sex }): number {
  // For men: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age) + 5
  // For women: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age) – 161
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (sex === 'male' ? 5 : -161);
  console.log(`[BMR Calculation] Height: ${heightCm}cm, Weight: ${weightKg}kg, Age: ${age}, Sex: ${sex}, BMR: ${bmr.toFixed(1)}`);
  return roundTo(bmr, 1);
}

// Step 2: Adjust for activity level (TDEE – Total Daily Energy Expenditure)
export function getActivityFactor(level: ActivityLevel): number {
  switch (level) {
    case 'inactive':        // Sedentary: BMR × 1.2
      return 1.2;
    case 'lightly-active':  // Lightly active: BMR × 1.375
      return 1.375;
    case 'moderately-active': // Moderately active: BMR × 1.55
      return 1.55;
    case 'very-active':     // Very active: BMR × 1.725
      return 1.725;
    case 'extremely-active': // Extra active: BMR × 1.9
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
  // Step 1: Calculate BMR using Mifflin-St Jeor Equation
  const bmr = calculateBMR(inputs);
  
  // Step 2: Calculate TDEE by adjusting BMR for activity level
  const activityFactor = getActivityFactor(inputs.activityLevel);
  const tdee = roundTo(bmr * activityFactor, 0);
  
  console.log(`[TDEE Calculation] BMR: ${bmr}, Activity Factor: ${activityFactor}, TDEE: ${tdee}`);
  
  // Step 3: Adjust for body goals
  const { targetCalories, goalAdjustment } = adjustForGoal(tdee, inputs.bodyGoal);
  
  return { bmr, tdee, targetCalories, activityFactor, goalAdjustment };
}

function roundTo(n: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}
