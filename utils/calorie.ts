export type Sex = 'male' | 'female';
export type ActivityLevel = 'inactive' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active';
export type BodyGoal = 'lose-weight' | 'slightly-lose-weight' | 'maintain-weight' | 'slightly-gain-weight' | 'gain-weight';
export type SeriousnessLevel = 'not-strict' | 'neutral' | 'very-strict';

export interface CalorieInputs {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  bodyGoal: BodyGoal;
  seriousnessLevel?: SeriousnessLevel;
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

export function adjustForGoal(tdee: number, goal: BodyGoal, seriousnessLevel: SeriousnessLevel = 'neutral', sex: Sex): { targetCalories: number; goalAdjustment: number } {
  let adj = 0;
  
  // Base TDEE calculation remains the same, adjust calorie targets depending on goal and seriousness level
  if (goal === 'lose-weight') {
    // Lose Weight adjustments based on seriousness
    if (seriousnessLevel === 'not-strict') {
      adj = -250; // Not too serious → TDEE – 250 calories/day (slower, ~0.5 lb/week)
    } else if (seriousnessLevel === 'neutral') {
      adj = -500; // Standard → TDEE – 500 calories/day (~1 lb/week)
    } else if (seriousnessLevel === 'very-strict') {
      adj = -750; // Very serious → TDEE – 750 calories/day (~1.5 lbs/week, max recommended)
    }
  } else if (goal === 'gain-weight') {
    // Gain Weight adjustments based on seriousness
    if (seriousnessLevel === 'not-strict') {
      adj = 250; // Not too serious → TDEE + 250 calories/day (slower, ~0.5 lb/week)
    } else if (seriousnessLevel === 'neutral') {
      adj = 500; // Standard → TDEE + 500 calories/day (~1 lb/week)
    } else if (seriousnessLevel === 'very-strict') {
      adj = 750; // Very serious → TDEE + 750 calories/day (~1.5 lbs/week)
    }
  } else if (goal === 'slightly-lose-weight') {
    adj = -250; // Keep existing logic for slightly lose weight
  } else if (goal === 'slightly-gain-weight') {
    adj = 250; // Keep existing logic for slightly gain weight
  } else {
    adj = 0; // Maintain (Neutral): Always set to TDEE baseline
  }

  let target = tdee + adj;
  
  // Safety checks: Never recommend less than 1,200 calories/day for women or 1,500 for men
  const minCalories = sex === 'female' ? 1200 : 1500;
  if (target < minCalories) {
    console.log(`[CalorieAdjustment] Target calories ${target} below minimum ${minCalories} for ${sex}, adjusting to minimum`);
    target = minCalories;
    adj = target - tdee; // Recalculate adjustment based on safety limit
  }
  
  console.log(`[CalorieAdjustment] Goal: ${goal}, Seriousness: ${seriousnessLevel}, TDEE: ${tdee}, Adjustment: ${adj}, Target: ${target}`);
  
  return { targetCalories: roundTo(target, 0), goalAdjustment: adj };
}

export function calculateCalorieTargets(inputs: CalorieInputs): CalorieTargets {
  // Step 1: Calculate BMR using Mifflin-St Jeor Equation
  const bmr = calculateBMR(inputs);
  
  // Step 2: Calculate TDEE by adjusting BMR for activity level
  const activityFactor = getActivityFactor(inputs.activityLevel);
  const tdee = roundTo(bmr * activityFactor, 0);
  
  console.log(`[TDEE Calculation] BMR: ${bmr}, Activity Factor: ${activityFactor}, TDEE: ${tdee}`);
  
  // Step 3: Adjust for body goals with seriousness level
  const { targetCalories, goalAdjustment } = adjustForGoal(tdee, inputs.bodyGoal, inputs.seriousnessLevel, inputs.sex);
  
  return { bmr, tdee, targetCalories, activityFactor, goalAdjustment };
}

function roundTo(n: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}
