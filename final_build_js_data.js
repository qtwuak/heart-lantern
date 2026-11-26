/* Heart Lantern 心燈 - static content (weather icons, guides, example lanterns, sample data).
   Everything here is plain data so it is easy to edit for the final project. */
window.HL = window.HL || {};
HL.data = (function () {
  var cloud = "M13 35a8 8 0 0 1 1-16 11 11 0 0 1 21 3 7 7 0 0 1 0 13z";
  var icons = {
    1: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 31a8 8 0 0 1 1-14 11 11 0 0 1 21 3 7 7 0 0 1 0 11z"/><path d="M25 29l-5 8h7l-4 8"/></svg>',
    2: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="' + cloud + '"/><path d="M17 40l-2 5M25 40l-2 5M33 40l-2 5"/></svg>',
    3: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 38a9 9 0 0 1 1-18 12 12 0 0 1 23 3 7.5 7.5 0 0 1 0 15z"/></svg>',
    4: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="17" cy="17" r="6"/><path d="M17 5v3M5 17h3M8.5 8.5l2 2M25.5 8.5l-2 2"/><path d="M17 42a7 7 0 0 1 1-14 9 9 0 0 1 17 2 6 6 0 0 1 0 12z"/></svg>',
    5: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/></svg>'
  };
  var weather = [
    { v: 1, name: "Stormy", hint: "Really hard" },
    { v: 2, name: "Rainy", hint: "Low and heavy" },
    { v: 3, name: "Cloudy", hint: "Flat, okay-ish" },
    { v: 4, name: "Mostly clear", hint: "Pretty good" },
    { v: 5, name: "Sunny", hint: "Bright" }
  ];
  var wind = ["Still", "Breezy", "Gusty", "Strong", "Gale"];
  var tags = ["Exams", "Assignments", "Group project", "Money", "Friends", "Family", "Relationship", "Health", "Sleep", "Loneliness", "Motivation", "Homesick", "Future", "Dorm life"];
  var lanternTags = {
    "Venting": "--rose", "Exam stress": "--glow", "Lonely": "--blue",
    "Small win": "--mint", "Question": "--lilac", "Gratitude": "--gold"
  };
  var examples = [
    { id: "x1", tag: "Exam stress", h: 3, light: 14, text: "Midterm week and I have slept maybe four hours a night. Everyone around me seems calm. Anyone else just running on tea and fear?" },
    { id: "x2", tag: "Small win", h: 7, light: 31, text: "I asked a question in class today. My heart was pounding the whole time and nothing bad happened. Tiny win, but it is mine." },
    { id: "x3", tag: "Lonely", h: 12, light: 22, text: "The dorm is extra quiet tonight and I miss home. I am going to call my mum and then make some noodles." },
    { id: "x4", tag: "Venting", h: 20, light: 9, text: "Our group project teammate vanished two weeks before the deadline. I am trying to stay calm and not blame anyone. Deep breath." },
    { id: "x5", tag: "Gratitude", h: 26, light: 40, text: "A stranger held the lift for me when I was running late and smiled. It helped more than they know. Thank you." },
    { id: "x6", tag: "Question", h: 30, light: 12, text: "How do you all stop comparing yourselves to classmates who seem to have everything figured out?" },
    { id: "x7", tag: "Small win", h: 41, light: 27, text: "Passed the calculus quiz I was dreading. Studied in short rounds instead of one giant night. It actually worked." },
    { id: "x8", tag: "Exam stress", h: 49, light: 18, text: "My mind went blank for a full minute in the exam. I put the pen down, breathed out slowly, and it came back. Writing this for whoever needs it." },
    { id: "x9", tag: "Venting", h: 58, light: 6, text: "Tired of feeling like I need to be productive every single minute. Resting is not a crime. Telling myself that tonight." },
    { id: "x10", tag: "Gratitude", h: 70, light: 35, text: "Thank you to the friend who sat with me in the library without saying much. Quiet company was exactly what I needed." },
    { id: "x11", tag: "Lonely", h: 84, light: 16, text: "Starting a new year in a new city and still finding my people. If you are also looking, hi." },
    { id: "x12", tag: "Question", h: 96, light: 11, text: "Does anyone have a good way to start when the task feels too big? I keep opening the file and closing it again." }
  ];
  var tips = [
    "Stuck? Set a 10-minute timer and do only the smallest piece. Starting is the hardest part.",
    "A longer exhale than inhale tells your body it is safe. Try in for 4, out for 6.",
    "Sleep before the exam usually beats one more hour of cramming.",
    "Quiz yourself out loud. Pulling an answer from memory teaches more than rereading.",
    "Drink some water and stand up for two minutes. Your brain will thank you.",
    "Comparison feels loud at night. Close the feed and name one thing you did today.",
    "Tell one person how you really are today. One honest sentence is enough.",
    "Plan tomorrow's first task before you sleep. Mornings get easier.",
    "Short rounds with real breaks beat long marathons for most people.",
    "Hard feelings usually move if you let them. They do not need to be fixed tonight.",
    "A ten-minute walk is a legitimate study technique.",
    "Eat something that is not instant noodles at least once today.",
    "You are allowed to ask for extensions, help and rest.",
    "Write the worry down. It takes up less room on paper than in your head."
  ];
  var hotlines = [
    { n: "1925", t: "Safe Mind Line (安心專線)", d: "Free, 24 hours. Stress, mood, thoughts of suicide." },
    { n: "1995", t: "Lifeline (生命線)", d: "24 hours. Crisis, suicide prevention, relationships." },
    { n: "1980", t: "Teacher Chang (張老師)", d: "Daytime and evening, shorter hours on Sunday. Emotional support." },
    { n: "113", t: "Protection line (保護專線)", d: "24 hours. Abuse, violence, sexual harassment or assault." },
    { n: "110", t: "Police, or 119 for an ambulance", d: "Immediate danger. Tell a roommate, friend or campus security too." }
  ];
  var guides = [
    { id: "g1", topic: "Sleep", title: "Can't sleep before an exam", min: 3,
      steps: ["If you are still awake after about 20 minutes, get up, dim the lights and do something boring until you feel sleepy.", "Do a brain dump: write tomorrow's worries on paper, then one next step for each. Close the notebook.", "Try the physiological sigh: two short breaths in through the nose, one long breath out. Repeat five times.", "Remind yourself that resting counts. One short night rarely ruins an exam.", "Skip caffeine late in the day and keep screens off for the last 30 minutes."],
      note: "If sleep trouble lasts for weeks, talk to a counsellor or doctor." },
    { id: "g2", topic: "Exams", title: "My mind went blank in the exam", min: 2,
      steps: ["Put the pen down. Take three slow breaths with a longer exhale.", "Reread the question slowly, one phrase at a time.", "Skip to an easier question to rebuild momentum.", "Write down anything you remember: keywords, formulas, a diagram. It often pulls the rest back.", "Blanking is a stress reaction. Memory returns as your body calms down."],
      note: "Practise this once before the exam so it feels familiar." },
    { id: "g3", topic: "Anxiety", title: "Presentation panic", min: 4,
      steps: ["Learn your first 30 seconds almost by heart. A smooth start settles the nerves.", "Practise out loud, standing up, at least three times. Use your own words, not a script.", "Breathe out slowly for a minute before you walk up.", "Pick two or three friendly faces and rotate your eye contact between them.", "Open your slides before your turn and show them full screen. It saves time and stress.", "A pause is fine. Take a breath, look at your slide, continue."],
      note: "Afterwards, note one thing that went well. Your brain remembers the bad bits unless you point out the good." },
    { id: "g4", topic: "Focus", title: "I can't start", min: 2,
      steps: ["Set a 10-minute timer and promise yourself only 10 minutes.", "Name the very first physical action: open the file, write the title, solve one problem.", "Put your phone in another room.", "Write a bad first draft on purpose. You can fix it later.", "Reward yourself after the round, not before."],
      note: "Starting is the hard part. Momentum usually does the rest." },
    { id: "g5", topic: "People", title: "Group project conflict", min: 4,
      steps: ["Agree on roles and deadlines in writing, even a short chat message.", "Talk about the problem, not the person: 'When X happens I feel Y. Could we do Z?'", "Set regular short check-ins.", "If someone goes silent, tell your teacher early and stick to facts.", "Keep a record of who contributed what."],
      note: "Early, calm messages beat late, angry ones." },
    { id: "g6", topic: "Wellbeing", title: "Homesick or lonely", min: 3,
      steps: ["Build small routines: a regular call home, a favourite study spot.", "Make one low-pressure plan each week: a club, a meal, a walk with someone.", "Look for peer groups, international student events or interest clubs.", "Let the feeling be there. It does not mean something is wrong with you.", "If it stays heavy for weeks, talk to a counsellor."],
      note: "Most people around you are looking for connection too." },
    { id: "g7", topic: "Wellbeing", title: "Signs of burnout", min: 3,
      steps: ["Watch for exhaustion that sleep does not fix, dread about things you used to like, and a growing 'what is the point'.", "Drop or postpone one non-essential commitment this week.", "Schedule one real rest block that is not scrolling.", "Tell your tutor or a friend how you are doing.", "If it persists, make an appointment with the counselling centre."],
      note: "Burnout is about load and recovery, not about being weak." },
    { id: "g8", topic: "Support", title: "Helping a friend who is struggling", min: 5,
      steps: ["Listen without trying to fix. 'That sounds really hard' goes a long way.", "If you are worried about suicide, ask directly and kindly: 'Are you thinking about ending your life?' Asking does not plant the idea.", "Stay with them and help them reach 1925, 1995, campus counselling or family.", "If they are in immediate danger call 110 or 119.", "Do not promise to keep it secret if their safety is at risk.", "Look after yourself too. You are not meant to carry this alone."],
      note: "You do not need the perfect words. Showing up is enough." },
    { id: "g9", topic: "Anxiety", title: "Comparing myself to others", min: 2,
      steps: ["Notice the thought and name it: 'I am comparing again.'", "Remember you see other people's highlights, not their bad nights.", "Write three things you have done this week that you could not do last term.", "Keep scrolling out of the last hour before bed.", "Tell a friend. They are probably doing the same thing."],
      note: "Comparison is a habit you can loosen with practice." }
  ];
  var sdgs = [
    { n: 3, name: "Good Health and Well-being", color: "#4C9F38", ink: "#fff",
      target: "Target 3.4 promotes mental health and well-being.",
      how: "Daily check-ins, calming tools, exam-week support, hotline access and a gentle AI companion lower the barrier to looking after your mind." },
    { n: 4, name: "Quality Education", color: "#C5192D", ink: "#fff",
      target: "Education works best when learners are healthy and supported.",
      how: "Study planning, focus rounds and guides for exam panic help students learn well without burning out." }
  ];
  var pulse = {
    weeks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"],
    mood: [3.7, 3.6, 3.5, 3.4, 2.9, 3.2, 3.5, 3.4, 3.0, 2.7],
    stress: [2.6, 2.7, 2.9, 3.0, 3.8, 3.4, 3.0, 3.1, 3.6, 4.1],
    exam: [4, 9],
    sources: [["Exams", 62], ["Assignments", 48], ["Sleep", 41], ["Future", 36], ["Money", 27], ["Loneliness", 22], ["Friends", 18]],
    groups: [
      { name: "Engineering", n: 84, mood: 3.2, stress: 3.4 },
      { name: "Management", n: 61, mood: 3.4, stress: 3.1 },
      { name: "Informatics", n: 73, mood: 3.1, stress: 3.5 },
      { name: "Humanities & Social Sci.", n: 42, mood: 3.5, stress: 3.0 },
      { name: "Small groups combined", n: 7, mood: null, stress: null }
    ]
  };
  return { icons: icons, weather: weather, wind: wind, tags: tags, lanternTags: lanternTags, examples: examples, tips: tips, hotlines: hotlines, guides: guides, sdgs: sdgs, pulse: pulse };
})();
