export type Sex = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extra-active';
export type BodyGoal = 'lose-weight' | 'maintain' | 'gain-weight';
export type GoalSeriousness = 'not-too-serious' | 'standard' | 'very-serious';

export interface CalorieInputs {
  height_cm: number;
  weight_kg: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  body_goal: BodyGoal;
  goal_seriousness?: GoalSeriousness;
}

export interface CalorieTargets {
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
  activityFactor: number;
  goalAdjustment: number;
}

// Step 1: Calculate BMR (Basal Metabolic Rate) using the Mifflin-St Jeor Equation
export function calculateBMR({ height_cm, weight_kg, age, sex }: { height_cm: number; weight_kg: number; age: number; sex: Sex }): number {
  // For men: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age) + 5
  // For women: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age) – 161
  let bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age);
  
  if (sex === 'male') {
    bmr += 5;
  } else if (sex === 'female') {
    bmr -= 161;
  } else {
    // For 'other', use average of male and female
    bmr -= 78;
  }
  
  console.log(`[BMR Calculation] Height: ${height_cm}cm, Weight: ${weight_kg}kg, Age: ${age}, Sex: ${sex}, BMR: ${bmr.toFixed(1)}`);
  return roundTo(bmr, 2);
}

// Step 2: Adjust for activity level (TDEE – Total Daily Energy Expenditure)
export function getActivityFactor(level: ActivityLevel): number {
  switch (level) {
    case 'sedentary':        // Sedentary: BMR × 1.2
      return 1.2;
    case 'lightly-active':  // Lightly active: BMR × 1.375
      return 1.375;
    case 'moderately-active': // Moderately active: BMR × 1.55
      return 1.55;
    case 'very-active':     // Very active: BMR × 1.725
      return 1.725;
    case 'extra-active': // Extra active: BMR × 1.9
      return 1.9;
    default:
      return 1.2;
  }
}

export function adjustForGoal(tdee: number, goal: BodyGoal, goal_seriousness: GoalSeriousness = 'standard', sex: Sex): { daily_calorie_target: number; goalAdjustment: number } {
  let adj = 0;
  
  // Base TDEE calculation remains the same, adjust calorie targets depending on goal and seriousness level
  if (goal === 'lose-weight') {
    // Lose Weight adjustments based on seriousness
    if (goal_seriousness === 'not-too-serious') {
      adj = -250; // Not too serious → TDEE – 250 calories/day (slower, ~0.5 lb/week)
    } else if (goal_seriousness === 'standard') {
      adj = -500; // Standard → TDEE – 500 calories/day (~1 lb/week)
    } else if (goal_seriousness === 'very-serious') {
      adj = -750; // Very serious → TDEE – 750 calories/day (~1.5 lbs/week, max recommended)
    }
  } else if (goal === 'gain-weight') {
    // Gain Weight adjustments based on seriousness
    if (goal_seriousness === 'not-too-serious') {
      adj = 250; // Not too serious → TDEE + 250 calories/day (slower, ~0.5 lb/week)
    } else if (goal_seriousness === 'standard') {
      adj = 500; // Standard → TDEE + 500 calories/day (~1 lb/week)
    } else if (goal_seriousness === 'very-serious') {
      adj = 750; // Very serious → TDEE + 750 calories/day (~1.5 lbs/week)
    }
  } else {
    adj = 0; // Maintain (Neutral): Always set to TDEE baseline
  }

  let target = tdee + adj;
  
  // Safety checks: Never recommend less than 1,200 calories/day for women or 1,500 for men
  const minCalories = sex === 'female' ? 1200 : (sex === 'male' ? 1500 : 1350);
  if (target < minCalories) {
    console.log(`[CalorieAdjustment] Target calories ${target} below minimum ${minCalories} for ${sex}, adjusting to minimum`);
    target = minCalories;
    adj = target - tdee; // Recalculate adjustment based on safety limit
  }
  
  console.log(`[CalorieAdjustment] Goal: ${goal}, Seriousness: ${goal_seriousness}, TDEE: ${tdee}, Adjustment: ${adj}, Target: ${target}`);
  
  return { daily_calorie_target: roundTo(target, 2), goalAdjustment: adj };
}

export function calculateCalorieTargets(inputs: CalorieInputs): CalorieTargets {
  // Step 1: Calculate BMR using Mifflin-St Jeor Equation
  const bmr = calculateBMR(inputs);
  
  // Step 2: Calculate TDEE by adjusting BMR for activity level
  const activityFactor = getActivityFactor(inputs.activity_level);
  const tdee = roundTo(bmr * activityFactor, 2);
  
  console.log(`[TDEE Calculation] BMR: ${bmr}, Activity Factor: ${activityFactor}, TDEE: ${tdee}`);
  
  // Step 3: Adjust for body goals with seriousness level
  const { daily_calorie_target, goalAdjustment } = adjustForGoal(tdee, inputs.body_goal, inputs.goal_seriousness, inputs.sex);
  
  return { bmr, tdee, daily_calorie_target, activityFactor, goalAdjustment };
}

function roundTo(n: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

// Helper functions for converting between different goal formats
export function normalizeBodyGoal(goal: string): BodyGoal {
  const normalized = goal.toLowerCase().replace(/[\s-_]/g, '-');
  
  if (normalized.includes('lose') || normalized.includes('weight-loss')) {
    return 'lose-weight';
  } else if (normalized.includes('gain') || normalized.includes('muscle') || normalized.includes('bulk')) {
    return 'gain-weight';
  } else {
    return 'maintain';
  }
}

export function normalizeActivityLevel(level: string): ActivityLevel {
  const normalized = level.toLowerCase().replace(/[\s-_]/g, '-');
  
  if (normalized.includes('sedentary') || normalized.includes('inactive')) {
    return 'sedentary';
  } else if (normalized.includes('lightly') || normalized.includes('light')) {
    return 'lightly-active';
  } else if (normalized.includes('moderately') || normalized.includes('moderate')) {
    return 'moderately-active';
  } else if (normalized.includes('very') || normalized.includes('highly')) {
    return 'very-active';
  } else if (normalized.includes('extra') || normalized.includes('extremely')) {
    return 'extra-active';
  } else {
    return 'moderately-active'; // Default fallback
  }
}

export function normalizeGoalSeriousness(seriousness: string): GoalSeriousness {
  const normalized = seriousness.toLowerCase().replace(/[\s-_]/g, '-');
  
  if (normalized.includes('not') || normalized.includes('casual') || normalized.includes('relaxed')) {
    return 'not-too-serious';
  } else if (normalized.includes('very') || normalized.includes('strict') || normalized.includes('aggressive')) {
    return 'very-serious';
  } else {
    return 'standard';
  }
}
