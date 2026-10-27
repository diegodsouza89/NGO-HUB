import { Language } from '../types';

/**
 * Fixed text on the home page hero (search box and self-assessment prompt), in
 * every language the guides are published in.
 *
 * Categories and articles were translated, but the hero around them was not:
 * switching to Hindi left the search placeholder and the "Begin
 * self-assessment" button in English. English is the fallback for any key a
 * language is missing.
 */
export interface HeroLabels {
  /** Shown instead of the tagline only while the admin has not changed it. */
  defaultTagline: string;
  searchPlaceholder: string;
  searchAria: string;
  clearSearch: string;
  noMatch: (q: string) => string;
  noMatchHint: string;
  keyHint: string;
  beginAssessment: string;
  assessmentSub: string;
}

export const DEFAULT_TAGLINE_EN =
  'A centralized technology and digital operations portal for non-profit organizations, grassroots leaders, and social impact teams.';

const en: HeroLabels = {
  defaultTagline: DEFAULT_TAGLINE_EN,
  searchPlaceholder: 'Search Google Workspace, cloud credits, CRM, cybersecurity…',
  searchAria: 'Search the knowledge hub',
  clearSearch: 'Clear search',
  noMatch: q => `Nothing matched “${q}”.`,
  noMatchHint: 'Try a shorter word, or ask the AI assistant at the bottom right of the page.',
  keyHint: 'Enter to open · ↑ ↓ to move · Esc to close',
  beginAssessment: 'Begin self-assessment',
  assessmentSub: '10 questions, about 3 minutes — see where your NGO stands and what to read first',
};

const hi: Partial<HeroLabels> = {
  defaultTagline: 'एनजीओ, ज़मीनी स्तर के नेताओं और सामाजिक प्रभाव वाली टीमों के लिए टेक्नोलॉजी और डिजिटल कामकाज का एक केंद्रीय पोर्टल।',
  searchPlaceholder: 'Google Workspace, क्लाउड क्रेडिट, CRM, साइबर सुरक्षा खोजें…',
  searchAria: 'नॉलेज हब में खोजें',
  clearSearch: 'खोज साफ़ करें',
  noMatch: q => `“${q}” से कुछ नहीं मिला।`,
  noMatchHint: 'छोटा शब्द आज़माएँ, या पेज के नीचे दाईं ओर AI सहायक से पूछें।',
  keyHint: 'खोलने के लिए Enter · ↑ ↓ से चुनें · बंद करने के लिए Esc',
  beginAssessment: 'स्व-मूल्यांकन शुरू करें',
  assessmentSub: '10 सवाल, लगभग 3 मिनट — देखें आपका एनजीओ कहाँ खड़ा है और पहले क्या पढ़ें',
};

const mr: Partial<HeroLabels> = {
  defaultTagline: 'एनजीओ, तळागाळातील नेते आणि सामाजिक परिणाम साधणाऱ्या टीम्ससाठी तंत्रज्ञान आणि डिजिटल कामकाजाचे एक केंद्रीय पोर्टल.',
  searchPlaceholder: 'Google Workspace, क्लाउड क्रेडिट, CRM, सायबर सुरक्षा शोधा…',
  searchAria: 'नॉलेज हबमध्ये शोधा',
  clearSearch: 'शोध साफ करा',
  noMatch: q => `“${q}” शी काहीही जुळले नाही.`,
  noMatchHint: 'छोटा शब्द वापरून पाहा, किंवा पानाच्या खाली उजवीकडील AI सहाय्यकाला विचारा.',
  keyHint: 'उघडण्यासाठी Enter · ↑ ↓ ने निवडा · बंद करण्यासाठी Esc',
  beginAssessment: 'स्व-मूल्यांकन सुरू करा',
  assessmentSub: '10 प्रश्न, साधारण 3 मिनिटे — तुमची एनजीओ कुठे आहे आणि आधी काय वाचावे ते पाहा',
};

const ta: Partial<HeroLabels> = {
  defaultTagline: 'என்ஜிஓக்கள், அடிமட்டத் தலைவர்கள் மற்றும் சமூகத் தாக்கக் குழுக்களுக்கான தொழில்நுட்பம் மற்றும் டிஜிட்டல் செயல்பாடுகளின் மைய இணையதளம்.',
  searchPlaceholder: 'Google Workspace, கிளவுட் கிரெடிட், CRM, சைபர் பாதுகாப்பு தேடுங்கள்…',
  searchAria: 'அறிவு மையத்தில் தேடுங்கள்',
  clearSearch: 'தேடலை அழி',
  noMatch: q => `“${q}” உடன் எதுவும் பொருந்தவில்லை.`,
  noMatchHint: 'சிறிய சொல்லை முயலுங்கள், அல்லது பக்கத்தின் கீழ் வலதுபுறம் உள்ள AI உதவியாளரிடம் கேளுங்கள்.',
  keyHint: 'திறக்க Enter · ↑ ↓ நகர்த்த · மூட Esc',
  beginAssessment: 'சுய மதிப்பீட்டைத் தொடங்குங்கள்',
  assessmentSub: '10 கேள்விகள், சுமார் 3 நிமிடங்கள் — உங்கள் என்ஜிஓ எங்கே உள்ளது, முதலில் எதைப் படிப்பது என்று பாருங்கள்',
};

const te: Partial<HeroLabels> = {
  defaultTagline: 'ఎన్‌జీఓలు, క్షేత్రస్థాయి నాయకులు, సామాజిక ప్రభావ బృందాల కోసం టెక్నాలజీ మరియు డిజిటల్ కార్యకలాపాల కేంద్ర పోర్టల్.',
  searchPlaceholder: 'Google Workspace, క్లౌడ్ క్రెడిట్‌లు, CRM, సైబర్ భద్రత వెతకండి…',
  searchAria: 'నాలెడ్జ్ హబ్‌లో వెతకండి',
  clearSearch: 'శోధన క్లియర్ చేయండి',
  noMatch: q => `“${q}”కు ఏదీ సరిపోలలేదు.`,
  noMatchHint: 'చిన్న పదం ప్రయత్నించండి, లేదా పేజీ కింద కుడివైపు ఉన్న AI సహాయకుడిని అడగండి.',
  keyHint: 'తెరవడానికి Enter · ↑ ↓ కదలడానికి · మూసివేయడానికి Esc',
  beginAssessment: 'స్వీయ మూల్యాంకనం ప్రారంభించండి',
  assessmentSub: '10 ప్రశ్నలు, సుమారు 3 నిమిషాలు — మీ ఎన్‌జీఓ ఎక్కడ ఉందో, ముందు ఏమి చదవాలో చూడండి',
};

const bn: Partial<HeroLabels> = {
  defaultTagline: 'এনজিও, তৃণমূল নেতা ও সামাজিক প্রভাব দলগুলোর জন্য প্রযুক্তি ও ডিজিটাল কাজকর্মের একটি কেন্দ্রীয় পোর্টাল।',
  searchPlaceholder: 'Google Workspace, ক্লাউড ক্রেডিট, CRM, সাইবার নিরাপত্তা খুঁজুন…',
  searchAria: 'নলেজ হাবে খুঁজুন',
  clearSearch: 'খোঁজা মুছুন',
  noMatch: q => `“${q}”-এর সঙ্গে কিছু মেলেনি।`,
  noMatchHint: 'ছোট শব্দ দিয়ে চেষ্টা করুন, অথবা পাতার নিচে ডানদিকের AI সহকারীকে জিজ্ঞাসা করুন।',
  keyHint: 'খুলতে Enter · ↑ ↓ দিয়ে সরান · বন্ধ করতে Esc',
  beginAssessment: 'স্ব-মূল্যায়ন শুরু করুন',
  assessmentSub: '10টি প্রশ্ন, প্রায় 3 মিনিট — আপনার এনজিও কোথায় দাঁড়িয়ে এবং আগে কী পড়বেন তা দেখুন',
};

const gu: Partial<HeroLabels> = {
  defaultTagline: 'એનજીઓ, પાયાના સ્તરના આગેવાનો અને સામાજિક અસર ટીમો માટે ટેક્નોલોજી અને ડિજિટલ કામગીરીનું એક કેન્દ્રીય પોર્ટલ.',
  searchPlaceholder: 'Google Workspace, ક્લાઉડ ક્રેડિટ, CRM, સાયબર સુરક્ષા શોધો…',
  searchAria: 'નોલેજ હબમાં શોધો',
  clearSearch: 'શોધ સાફ કરો',
  noMatch: q => `“${q}” સાથે કંઈ મળ્યું નહીં.`,
  noMatchHint: 'નાનો શબ્દ અજમાવો, અથવા પાનાની નીચે જમણી બાજુના AI સહાયકને પૂછો.',
  keyHint: 'ખોલવા Enter · ↑ ↓ થી ખસેડો · બંધ કરવા Esc',
  beginAssessment: 'સ્વ-મૂલ્યાંકન શરૂ કરો',
  assessmentSub: '10 પ્રશ્નો, લગભગ 3 મિનિટ — તમારી એનજીઓ ક્યાં છે અને પહેલાં શું વાંચવું તે જુઓ',
};

const kn: Partial<HeroLabels> = {
  defaultTagline: 'ಎನ್‌ಜಿಒಗಳು, ತಳಮಟ್ಟದ ನಾಯಕರು ಮತ್ತು ಸಾಮಾಜಿಕ ಪರಿಣಾಮ ತಂಡಗಳಿಗಾಗಿ ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ಡಿಜಿಟಲ್ ಕಾರ್ಯಾಚರಣೆಗಳ ಕೇಂದ್ರ ಪೋರ್ಟಲ್.',
  searchPlaceholder: 'Google Workspace, ಕ್ಲೌಡ್ ಕ್ರೆಡಿಟ್, CRM, ಸೈಬರ್ ಸುರಕ್ಷತೆ ಹುಡುಕಿ…',
  searchAria: 'ಜ್ಞಾನ ಕೇಂದ್ರದಲ್ಲಿ ಹುಡುಕಿ',
  clearSearch: 'ಹುಡುಕಾಟ ತೆರವುಗೊಳಿಸಿ',
  noMatch: q => `“${q}” ಗೆ ಏನೂ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ.`,
  noMatchHint: 'ಚಿಕ್ಕ ಪದ ಪ್ರಯತ್ನಿಸಿ, ಅಥವಾ ಪುಟದ ಕೆಳಗೆ ಬಲಭಾಗದ AI ಸಹಾಯಕರನ್ನು ಕೇಳಿ.',
  keyHint: 'ತೆರೆಯಲು Enter · ↑ ↓ ಸರಿಸಲು · ಮುಚ್ಚಲು Esc',
  beginAssessment: 'ಸ್ವಯಂ ಮೌಲ್ಯಮಾಪನ ಪ್ರಾರಂಭಿಸಿ',
  assessmentSub: '10 ಪ್ರಶ್ನೆಗಳು, ಸುಮಾರು 3 ನಿಮಿಷ — ನಿಮ್ಮ ಎನ್‌ಜಿಒ ಎಲ್ಲಿದೆ ಮತ್ತು ಮೊದಲು ಏನು ಓದಬೇಕು ಎಂದು ನೋಡಿ',
};

const TABLE: Record<string, Partial<HeroLabels>> = { en, hi, mr, ta, te, bn, gu, kn };

export function heroLabels(lang: Language | string): HeroLabels {
  return { ...en, ...(TABLE[lang] || {}) } as HeroLabels;
}
