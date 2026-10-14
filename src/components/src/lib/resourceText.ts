import { Language } from '../types';
import { ResourceKind } from './resources';

/**
 * Interface text for the public "Posters & Policy Templates" page and its
 * card on the home page, in every language the site's picker offers.
 * Missing keys fall back to English.
 */

export interface ResourceText {
  home: string;
  title: string;
  badge: string;
  intro: string;
  cardDesc: string;
  browse: string;
  all: string;
  allLanguages: string;
  language: string;
  search: string;
  loading: string;
  unavailable: string;
  noMatch: string;
  empty: string;
  view: string;
  download: string;
  downloadFailed: string;
  close: string;
  previewLoading: string;
  previewFailed: string;
  noPreview: string;
  kindLabels: Record<ResourceKind, string>;
  kindPlurals: Record<ResourceKind, string>;
}

const en: ResourceText = {
  home: 'Knowledge Hub Home',
  title: 'Posters & Policy Templates',
  badge: 'Free to download and use',
  intro:
    'Ready-made posters, policy and document templates for your organisation. View, download, adapt and use them in your work.',
  cardDesc: 'Ready-made posters and policy templates you can view, download and adapt for your organisation.',
  browse: 'Browse posters & policies',
  all: 'All',
  allLanguages: 'All languages',
  language: 'Language',
  search: 'Search posters & policies',
  loading: 'Loading…',
  unavailable: 'Posters and templates are not available right now. Please try again later.',
  noMatch: 'Nothing matches your search.',
  empty: 'Nothing has been added yet.',
  view: 'View',
  download: 'Download',
  downloadFailed: 'Download failed. Please try again.',
  close: 'Close',
  previewLoading: 'Loading preview…',
  previewFailed: 'Could not load the preview. You can still download the file.',
  noPreview: "A preview isn't available for this file type. Download it to open it on your device.",
  kindLabels: { poster: 'Poster', policy: 'Policy template', template: 'Document template', other: 'Other' },
  kindPlurals: { poster: 'Posters', policy: 'Policy templates', template: 'Document templates', other: 'Other' },
};

const hi: ResourceText = {
  home: 'नॉलेज हब होम',
  title: 'पोस्टर और नीति टेम्पलेट',
  badge: 'मुफ़्त डाउनलोड और उपयोग करें',
  intro:
    'आपके संगठन के लिए तैयार पोस्टर, नीति और दस्तावेज़ टेम्पलेट। इन्हें देखें, डाउनलोड करें, अपनी ज़रूरत के अनुसार बदलें और अपने काम में उपयोग करें।',
  cardDesc: 'तैयार पोस्टर और नीति टेम्पलेट, जिन्हें आप अपने संगठन के लिए देख, डाउनलोड और बदल सकते हैं।',
  browse: 'पोस्टर और नीतियाँ देखें',
  all: 'सभी',
  allLanguages: 'सभी भाषाएँ',
  language: 'भाषा',
  search: 'पोस्टर और नीतियाँ खोजें',
  loading: 'लोड हो रहा है…',
  unavailable: 'पोस्टर और टेम्पलेट अभी उपलब्ध नहीं हैं। कृपया बाद में पुनः प्रयास करें।',
  noMatch: 'आपकी खोज से कुछ भी मेल नहीं खाता।',
  empty: 'अभी तक कुछ भी जोड़ा नहीं गया है।',
  view: 'देखें',
  download: 'डाउनलोड',
  downloadFailed: 'डाउनलोड विफल रहा। कृपया पुनः प्रयास करें।',
  close: 'बंद करें',
  previewLoading: 'प्रीव्यू लोड हो रहा है…',
  previewFailed: 'प्रीव्यू लोड नहीं हो सका। आप फिर भी फ़ाइल डाउनलोड कर सकते हैं।',
  noPreview: 'इस प्रकार की फ़ाइल का प्रीव्यू उपलब्ध नहीं है। इसे अपने डिवाइस पर खोलने के लिए डाउनलोड करें।',
  kindLabels: { poster: 'पोस्टर', policy: 'नीति टेम्पलेट', template: 'दस्तावेज़ टेम्पलेट', other: 'अन्य' },
  kindPlurals: { poster: 'पोस्टर', policy: 'नीति टेम्पलेट', template: 'दस्तावेज़ टेम्पलेट', other: 'अन्य' },
};

const mr: ResourceText = {
  home: 'नॉलेज हब मुख्यपृष्ठ',
  title: 'पोस्टर्स आणि धोरण टेम्पलेट्स',
  badge: 'मोफत डाउनलोड आणि वापर',
  intro:
    'तुमच्या संस्थेसाठी तयार पोस्टर्स, धोरण आणि दस्तऐवज टेम्पलेट्स. ते पाहा, डाउनलोड करा, गरजेनुसार बदला आणि तुमच्या कामात वापरा.',
  cardDesc: 'तयार पोस्टर्स आणि धोरण टेम्पलेट्स जे तुम्ही तुमच्या संस्थेसाठी पाहू, डाउनलोड करू आणि बदलू शकता.',
  browse: 'पोस्टर्स आणि धोरणे पाहा',
  all: 'सर्व',
  allLanguages: 'सर्व भाषा',
  language: 'भाषा',
  search: 'पोस्टर्स आणि धोरणे शोधा',
  loading: 'लोड होत आहे…',
  unavailable: 'पोस्टर्स आणि टेम्पलेट्स सध्या उपलब्ध नाहीत. कृपया नंतर पुन्हा प्रयत्न करा.',
  noMatch: 'तुमच्या शोधाशी काहीही जुळत नाही.',
  empty: 'अद्याप काहीही जोडलेले नाही.',
  view: 'पाहा',
  download: 'डाउनलोड',
  downloadFailed: 'डाउनलोड अयशस्वी झाले. कृपया पुन्हा प्रयत्न करा.',
  close: 'बंद करा',
  previewLoading: 'पूर्वावलोकन लोड होत आहे…',
  previewFailed: 'पूर्वावलोकन लोड करता आले नाही. तरीही तुम्ही फाइल डाउनलोड करू शकता.',
  noPreview: 'या प्रकारच्या फाइलचे पूर्वावलोकन उपलब्ध नाही. तुमच्या डिव्हाइसवर उघडण्यासाठी ती डाउनलोड करा.',
  kindLabels: { poster: 'पोस्टर', policy: 'धोरण टेम्पलेट', template: 'दस्तऐवज टेम्पलेट', other: 'इतर' },
  kindPlurals: { poster: 'पोस्टर्स', policy: 'धोरण टेम्पलेट्स', template: 'दस्तऐवज टेम्पलेट्स', other: 'इतर' },
};

const ta: ResourceText = {
  home: 'அறிவு மைய முகப்பு',
  title: 'சுவரொட்டிகள் & கொள்கை வார்ப்புருக்கள்',
  badge: 'இலவசமாகப் பதிவிறக்கிப் பயன்படுத்தலாம்',
  intro:
    'உங்கள் நிறுவனத்திற்கான தயாரான சுவரொட்டிகள், கொள்கை மற்றும் ஆவண வார்ப்புருக்கள். இவற்றைப் பார்க்கவும், பதிவிறக்கவும், தேவைக்கேற்ப மாற்றி உங்கள் பணியில் பயன்படுத்தவும்.',
  cardDesc: 'உங்கள் நிறுவனத்திற்காகப் பார்த்து, பதிவிறக்கி, மாற்றிக்கொள்ளக்கூடிய தயாரான சுவரொட்டிகள் மற்றும் கொள்கை வார்ப்புருக்கள்.',
  browse: 'சுவரொட்டிகள் & கொள்கைகளைப் பார்க்கவும்',
  all: 'அனைத்தும்',
  allLanguages: 'அனைத்து மொழிகளும்',
  language: 'மொழி',
  search: 'சுவரொட்டிகள் & கொள்கைகளைத் தேடவும்',
  loading: 'ஏற்றப்படுகிறது…',
  unavailable: 'சுவரொட்டிகள் மற்றும் வார்ப்புருக்கள் தற்போது கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  noMatch: 'உங்கள் தேடலுக்கு எதுவும் பொருந்தவில்லை.',
  empty: 'இன்னும் எதுவும் சேர்க்கப்படவில்லை.',
  view: 'பார்க்க',
  download: 'பதிவிறக்கு',
  downloadFailed: 'பதிவிறக்கம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
  close: 'மூடு',
  previewLoading: 'முன்னோட்டம் ஏற்றப்படுகிறது…',
  previewFailed: 'முன்னோட்டத்தை ஏற்ற முடியவில்லை. நீங்கள் கோப்பைப் பதிவிறக்கலாம்.',
  noPreview: 'இந்த வகைக் கோப்புக்கு முன்னோட்டம் இல்லை. உங்கள் சாதனத்தில் திறக்க அதைப் பதிவிறக்கவும்.',
  kindLabels: { poster: 'சுவரொட்டி', policy: 'கொள்கை வார்ப்புரு', template: 'ஆவண வார்ப்புரு', other: 'மற்றவை' },
  kindPlurals: { poster: 'சுவரொட்டிகள்', policy: 'கொள்கை வார்ப்புருக்கள்', template: 'ஆவண வார்ப்புருக்கள்', other: 'மற்றவை' },
};

const te: ResourceText = {
  home: 'నాలెడ్జ్ హబ్ హోమ్',
  title: 'పోస్టర్లు & పాలసీ టెంప్లేట్లు',
  badge: 'ఉచితంగా డౌన్‌లోడ్ చేసి వాడుకోండి',
  intro:
    'మీ సంస్థ కోసం సిద్ధంగా ఉన్న పోస్టర్లు, పాలసీ మరియు డాక్యుమెంట్ టెంప్లేట్లు. వీటిని చూడండి, డౌన్‌లోడ్ చేయండి, అవసరానికి తగ్గట్టు మార్చి మీ పనిలో ఉపయోగించండి.',
  cardDesc: 'మీ సంస్థ కోసం చూసి, డౌన్‌లోడ్ చేసి, మార్చుకోగల సిద్ధమైన పోస్టర్లు మరియు పాలసీ టెంప్లేట్లు.',
  browse: 'పోస్టర్లు & పాలసీలు చూడండి',
  all: 'అన్నీ',
  allLanguages: 'అన్ని భాషలు',
  language: 'భాష',
  search: 'పోస్టర్లు & పాలసీలు వెతకండి',
  loading: 'లోడ్ అవుతోంది…',
  unavailable: 'పోస్టర్లు మరియు టెంప్లేట్లు ప్రస్తుతం అందుబాటులో లేవు. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.',
  noMatch: 'మీ శోధనకు ఏదీ సరిపోలలేదు.',
  empty: 'ఇంకా ఏదీ జోడించబడలేదు.',
  view: 'చూడండి',
  download: 'డౌన్‌లోడ్',
  downloadFailed: 'డౌన్‌లోడ్ విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
  close: 'మూసివేయి',
  previewLoading: 'ప్రివ్యూ లోడ్ అవుతోంది…',
  previewFailed: 'ప్రివ్యూ లోడ్ కాలేదు. మీరు ఫైల్‌ను డౌన్‌లోడ్ చేసుకోవచ్చు.',
  noPreview: 'ఈ రకమైన ఫైల్‌కు ప్రివ్యూ అందుబాటులో లేదు. మీ పరికరంలో తెరవడానికి దాన్ని డౌన్‌లోడ్ చేయండి.',
  kindLabels: { poster: 'పోస్టర్', policy: 'పాలసీ టెంప్లేట్', template: 'డాక్యుమెంట్ టెంప్లేట్', other: 'ఇతర' },
  kindPlurals: { poster: 'పోస్టర్లు', policy: 'పాలసీ టెంప్లేట్లు', template: 'డాక్యుమెంట్ టెంప్లేట్లు', other: 'ఇతరాలు' },
};

const bn: ResourceText = {
  home: 'নলেজ হাব হোম',
  title: 'পোস্টার ও নীতি টেমপ্লেট',
  badge: 'বিনামূল্যে ডাউনলোড ও ব্যবহার করুন',
  intro:
    'আপনার সংস্থার জন্য তৈরি পোস্টার, নীতি ও নথির টেমপ্লেট। এগুলি দেখুন, ডাউনলোড করুন, প্রয়োজনমতো বদলে আপনার কাজে ব্যবহার করুন।',
  cardDesc: 'আপনার সংস্থার জন্য দেখে, ডাউনলোড করে ও বদলে নেওয়ার মতো তৈরি পোস্টার ও নীতি টেমপ্লেট।',
  browse: 'পোস্টার ও নীতি দেখুন',
  all: 'সব',
  allLanguages: 'সব ভাষা',
  language: 'ভাষা',
  search: 'পোস্টার ও নীতি খুঁজুন',
  loading: 'লোড হচ্ছে…',
  unavailable: 'পোস্টার ও টেমপ্লেট এখন পাওয়া যাচ্ছে না। অনুগ্রহ করে পরে আবার চেষ্টা করুন।',
  noMatch: 'আপনার অনুসন্ধানের সাথে কিছুই মেলেনি।',
  empty: 'এখনও কিছু যোগ করা হয়নি।',
  view: 'দেখুন',
  download: 'ডাউনলোড',
  downloadFailed: 'ডাউনলোড ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
  close: 'বন্ধ করুন',
  previewLoading: 'প্রিভিউ লোড হচ্ছে…',
  previewFailed: 'প্রিভিউ লোড করা যায়নি। আপনি তবুও ফাইলটি ডাউনলোড করতে পারেন।',
  noPreview: 'এই ধরনের ফাইলের প্রিভিউ পাওয়া যায় না। আপনার ডিভাইসে খুলতে এটি ডাউনলোড করুন।',
  kindLabels: { poster: 'পোস্টার', policy: 'নীতি টেমপ্লেট', template: 'নথির টেমপ্লেট', other: 'অন্যান্য' },
  kindPlurals: { poster: 'পোস্টার', policy: 'নীতি টেমপ্লেট', template: 'নথির টেমপ্লেট', other: 'অন্যান্য' },
};

const gu: ResourceText = {
  home: 'નોલેજ હબ હોમ',
  title: 'પોસ્ટર અને નીતિ ટેમ્પલેટ',
  badge: 'મફત ડાઉનલોડ અને ઉપયોગ કરો',
  intro:
    'તમારી સંસ્થા માટે તૈયાર પોસ્ટર, નીતિ અને દસ્તાવેજ ટેમ્પલેટ. તેમને જુઓ, ડાઉનલોડ કરો, જરૂર મુજબ બદલો અને તમારા કામમાં ઉપયોગ કરો.',
  cardDesc: 'તમારી સંસ્થા માટે જોઈ, ડાઉનલોડ કરી અને બદલી શકાય તેવા તૈયાર પોસ્ટર અને નીતિ ટેમ્પલેટ.',
  browse: 'પોસ્ટર અને નીતિઓ જુઓ',
  all: 'બધા',
  allLanguages: 'બધી ભાષાઓ',
  language: 'ભાષા',
  search: 'પોસ્ટર અને નીતિઓ શોધો',
  loading: 'લોડ થઈ રહ્યું છે…',
  unavailable: 'પોસ્ટર અને ટેમ્પલેટ હાલમાં ઉપલબ્ધ નથી. કૃપા કરીને પછીથી ફરી પ્રયાસ કરો.',
  noMatch: 'તમારી શોધ સાથે કંઈ મેળ ખાતું નથી.',
  empty: 'હજી સુધી કંઈ ઉમેરવામાં આવ્યું નથી.',
  view: 'જુઓ',
  download: 'ડાઉનલોડ',
  downloadFailed: 'ડાઉનલોડ નિષ્ફળ ગયું. કૃપા કરીને ફરી પ્રયાસ કરો.',
  close: 'બંધ કરો',
  previewLoading: 'પૂર્વાવલોકન લોડ થઈ રહ્યું છે…',
  previewFailed: 'પૂર્વાવલોકન લોડ થઈ શક્યું નથી. તમે હજી પણ ફાઇલ ડાઉનલોડ કરી શકો છો.',
  noPreview: 'આ પ્રકારની ફાઇલનું પૂર્વાવલોકન ઉપલબ્ધ નથી. તમારા ઉપકરણ પર ખોલવા માટે તેને ડાઉનલોડ કરો.',
  kindLabels: { poster: 'પોસ્ટર', policy: 'નીતિ ટેમ્પલેટ', template: 'દસ્તાવેજ ટેમ્પલેટ', other: 'અન્ય' },
  kindPlurals: { poster: 'પોસ્ટર', policy: 'નીતિ ટેમ્પલેટ', template: 'દસ્તાવેજ ટેમ્પલેટ', other: 'અન્ય' },
};

const kn: ResourceText = {
  home: 'ನಾಲೆಡ್ಜ್ ಹಬ್ ಮುಖಪುಟ',
  title: 'ಪೋಸ್ಟರ್‌ಗಳು ಮತ್ತು ನೀತಿ ಟೆಂಪ್ಲೇಟ್‌ಗಳು',
  badge: 'ಉಚಿತವಾಗಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ ಬಳಸಿ',
  intro:
    'ನಿಮ್ಮ ಸಂಸ್ಥೆಗಾಗಿ ಸಿದ್ಧವಾದ ಪೋಸ್ಟರ್‌ಗಳು, ನೀತಿ ಮತ್ತು ದಾಖಲೆ ಟೆಂಪ್ಲೇಟ್‌ಗಳು. ಅವುಗಳನ್ನು ವೀಕ್ಷಿಸಿ, ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ, ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕಂತೆ ಬದಲಾಯಿಸಿ ಮತ್ತು ನಿಮ್ಮ ಕೆಲಸದಲ್ಲಿ ಬಳಸಿ.',
  cardDesc: 'ನಿಮ್ಮ ಸಂಸ್ಥೆಗಾಗಿ ವೀಕ್ಷಿಸಬಹುದಾದ, ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದಾದ ಮತ್ತು ಬದಲಾಯಿಸಬಹುದಾದ ಸಿದ್ಧ ಪೋಸ್ಟರ್‌ಗಳು ಮತ್ತು ನೀತಿ ಟೆಂಪ್ಲೇಟ್‌ಗಳು.',
  browse: 'ಪೋಸ್ಟರ್‌ಗಳು ಮತ್ತು ನೀತಿಗಳನ್ನು ನೋಡಿ',
  all: 'ಎಲ್ಲಾ',
  allLanguages: 'ಎಲ್ಲಾ ಭಾಷೆಗಳು',
  language: 'ಭಾಷೆ',
  search: 'ಪೋಸ್ಟರ್‌ಗಳು ಮತ್ತು ನೀತಿಗಳನ್ನು ಹುಡುಕಿ',
  loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  unavailable: 'ಪೋಸ್ಟರ್‌ಗಳು ಮತ್ತು ಟೆಂಪ್ಲೇಟ್‌ಗಳು ಈಗ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  noMatch: 'ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಯಾವುದೂ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ.',
  empty: 'ಇನ್ನೂ ಏನನ್ನೂ ಸೇರಿಸಲಾಗಿಲ್ಲ.',
  view: 'ವೀಕ್ಷಿಸಿ',
  download: 'ಡೌನ್‌ಲೋಡ್',
  downloadFailed: 'ಡೌನ್‌ಲೋಡ್ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  close: 'ಮುಚ್ಚಿ',
  previewLoading: 'ಪೂರ್ವವೀಕ್ಷಣೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  previewFailed: 'ಪೂರ್ವವೀಕ್ಷಣೆಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ. ನೀವು ಫೈಲ್ ಅನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದು.',
  noPreview: 'ಈ ರೀತಿಯ ಫೈಲ್‌ಗೆ ಪೂರ್ವವೀಕ್ಷಣೆ ಲಭ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ತೆರೆಯಲು ಅದನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ.',
  kindLabels: { poster: 'ಪೋಸ್ಟರ್', policy: 'ನೀತಿ ಟೆಂಪ್ಲೇಟ್', template: 'ದಾಖಲೆ ಟೆಂಪ್ಲೇಟ್', other: 'ಇತರೆ' },
  kindPlurals: { poster: 'ಪೋಸ್ಟರ್‌ಗಳು', policy: 'ನೀತಿ ಟೆಂಪ್ಲೇಟ್‌ಗಳು', template: 'ದಾಖಲೆ ಟೆಂಪ್ಲೇಟ್‌ಗಳು', other: 'ಇತರೆ' },
};

const TEXT: Record<Language, ResourceText> = { en, hi, mr, ta, te, bn, gu, kn };

export function resourceText(lang: Language): ResourceText {
  return TEXT[lang] || en;
}
