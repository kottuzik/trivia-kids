import type { Dictionary } from "../getDictionary";

const en: Dictionary = {
  meta: {
    appName: "Trivia Kids",
    description: "An educational trivia game for kids, with questions matched to age, topic and difficulty.",
    quizTitle: "Game setup",
    aboutTitle: "About",
    notFoundTitle: "Page not found",
  },
  common: {
    skipToContent: "Skip to main content",
    backHome: "Back to home",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    navLabel: "Main navigation",
    nav: {
      home: "Home",
      quiz: "Game",
      about: "About",
    },
  },
  home: {
    tagline: "A fun quiz game for curious kids",
    languageLabel: "Choose a language",
    ageLabel: "Choose an age group",
    ageGroups: {
      "6-9": "Ages 6–9",
      "10-12": "Ages 10–12",
      "13-16": "Ages 13–16",
    },
    ageUnit: "years old",
    start: "Start playing",
    howToPlay: "How to play?",
    about: "About",
    chooseAgeFirst: "To start, please choose an age group first.",
  },
  quiz: {
    heading: "Game setup",
    yourChoices: "Your choices",
    languageLabel: "Language",
    ageLabel: "Age group",
    change: "Change on home page",
    noAgeTitle: "No age group chosen yet",
    noAgeText: "Go back to the home page and choose an age group to start.",
    goHome: "Go to home page",
    difficultyLabel: "Difficulty",
    difficulties: {
      easy: { label: "Easy", hint: "A great place to start" },
      medium: { label: "Medium", hint: "A bit more of a challenge" },
      hard: { label: "Hard", hint: "For little experts" },
    },
    countLabel: "Number of questions",
    countOption: "{n} questions",
    topicLabel: "Topic",
    topicPlaceholder: "For example: space, dinosaurs, football",
    startGame: "Start game",
    comingSoon: "Question generation will be added in the next development stage.",
  },
  about: {
    heading: "About",
    intro: "A fun and educational quiz game for curious kids, with many topics and difficulty levels.",
    goalTitle: "Why play?",
    goalText: "To spark curiosity, learning and fun — on any topic you like.",
    sourceTitle: "Where do the questions come from?",
    sourceText:
      "Questions are created with artificial intelligence and matched to the age, language and difficulty you chose. Every question is checked before it is shown, but mistakes can still happen — and then you can report it.",
    howToPlayTitle: "How to play?",
    steps: [
      {
        title: "Choose a language and age",
        text: "On the home page, choose a language (Hebrew, English or Russian) and an age group: 6–9, 10–12 or 13–16.",
      },
      {
        title: "Set up the game",
        text: "Choose a difficulty — easy, medium or hard — and the number of questions: 5, 10 or 15.",
      },
      {
        title: "Pick a topic",
        text: "Type any topic you like, or pick one of the suggested topics.",
      },
      {
        title: "Answer the questions",
        text: "Each question has four answers. Choose only one — you can't try the same question again.",
      },
      {
        title: "Learn from every answer",
        text: "After each answer you'll see if you were right, and if not — the correct answer. A short explanation always appears too. When you're ready, press \"Next question\".",
      },
      {
        title: "Skip when you need to",
        text: "You can skip up to three questions per game. A skipped question is replaced by another one and doesn't change your score.",
      },
      {
        title: "Change settings any time",
        text: "You can change the topic, language, age group or difficulty at any moment. The change applies from the next question, and your score is kept.",
      },
      {
        title: "Continue where you stopped",
        text: "The game is saved automatically on your device. You can switch screens or close the app and continue later.",
      },
      {
        title: "See your summary",
        text: "At the end you'll see how many answers were correct, your success rate, and the questions you got wrong with the correct answers.",
      },
      {
        title: "Report a problem question",
        text: "If a question looks wrong or unsuitable, press \"Report question\". Reporting doesn't change your score.",
      },
    ],
    toGame: "Go to the game",
    backHome: "Back to home",
  },
  notFound: {
    heading: "Oops! Page not found",
    text: "The link may be wrong. Shall we go back home?",
    goHome: "Go to home page",
  },
};

export default en;
