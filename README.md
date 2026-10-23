# 🍽️ SayMeal — Say it. Track it.

🚀 **Live Demo:** [https://say-meal.vercel.app/](https://say-meal.vercel.app/)

**An AI-powered nutrition tracker that makes logging meals effortless.**

SayMeal makes nutrition tracking simpler. Describe what you ate using natural language, review AI-estimated calories and macronutrients, and track your daily nutrition goals without manually searching for every food item.

## ✨ Features

- **🎙️ Voice-Assisted Meal Logging:** Use Wispr Flow to dictate meal descriptions naturally into the text input.
- **🤖 AI-Powered Nutrition Estimates:** Estimate calories, protein, carbohydrates, and fats using Google Gemini.
- **⌨️ Natural Language Input:** Log meals by describing foods and portion sizes in plain English.
- **📊 Daily Nutrition Dashboard:** Track calorie intake, macronutrients, and progress toward daily goals.
- **✏️ Review and Edit:** Review AI-generated meal estimates and adjust portions or nutrition values before or after saving.
- **📅 Meal History:** Browse meals from previous days and track your progress over time.
- **🔁 Repeat Meals:** Quickly log previously saved meals again.
- **🗑️ Meal Management:** Edit or delete saved meals while keeping nutrition totals updated.
- **📸 Photo-Based Meal Logging:** Upload a food photo to estimate its nutritional content.
- **🔐 Anonymous Authentication:** Get started without a traditional sign-up flow.

## 🛠️ Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database and Authentication:** Supabase
- **AI and Nutrition Estimation:** Google Gemini API
- **Voice Dictation:** Wispr Flow
- **Deployment:** Vercel

## ⚙️ How It Works

1. Describe your meal in plain English, using Wispr Flow to dictate if preferred.
2. SayMeal sends the text or food photo to its AI-powered estimation flow.
3. Review the estimated food items, portions, calories, and macronutrients.
4. Confirm the meal to save it to your dashboard.
5. Track daily nutrition, revisit previous meals, or repeat a saved meal.

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- A Supabase project
- A Google Gemini API key

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/SayMeal.git
cd SayMeal
npm install
```

Replace `YOUR_USERNAME` with your GitHub username and use the repository's actual URL if it differs.

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GEMINI_API_KEY=your_gemini_api_key
```

Use the exact Supabase key variable supported by the codebase. Keep `GEMINI_API_KEY` server-side and never commit `.env.local` or expose secrets through `NEXT_PUBLIC_` variables.

### Database Setup

Configure your Supabase project, apply the SQL migration in `supabase/migrations/`, and enable anonymous authentication. Ensure the database's Row Level Security policies are active.

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Security and Privacy

- Gemini API requests are handled through server-side API routes.
- Supabase Row Level Security (RLS) protects user-owned records.
- Original food photos are processed for estimation and are not stored by the app.
- API keys and environment variables should remain private.

## ⚠️ Disclaimer

Nutrition values are AI-generated estimates and may vary based on ingredients, preparation methods, and portion sizes. They should not be treated as exact measurements or medical advice.
