import { Language } from '../types';

/**
 * Fixed text for the Scam Check feature (home-page banner, mobile menu link and
 * the /scam-check page) in every portal language. The AI result itself
 * (summary, flags, advice) is already returned in the chosen language by
 * /api/scam-check. English is the fallback for any missing key.
 */
export interface ScamLabels {
  heroCta: string;
  navLink: string;
  back: string;
  badge: string;
  title: string;
  intro: string;
  placeholder: string;
  addScreenshot: string;
  screenshotHint: string;
  removeScreenshot: string;
  chooseFile: string;
  checking: string;
  checkNow: string;
  clear: string;
  tryExample: string;
  exFee: string;
  exFcra: string;
  exBoss: string;
  exPhone: string;
  verdictScam: string;
  verdictSuspicious: string;
  verdictSafe: string;
  riskScore: string;
  redFlags: string;
  links: string;
  riskyLink: string;
  nextSteps: string;
  extracted: string;
  aiUnavailable: string;
  reportTitle: string;
  reportSub: string;
  callTitle: string;
  callSub: string;
  saathiSub: string;
  disclaimer: string;
  errFileType: string;
  errFileSize: string;
  errRead: string;
  errEmpty: string;
  errUnavailable: string;
  errGeneric: string;
}

const en: ScamLabels = {
  heroCta: "Got a suspicious message? Check if it's a scam",
  navLink: 'Is this a scam? Check it',
  back: 'Back to Hub',
  badge: "Don't trust. Verify.",
  title: 'Is this a scam?',
  intro: 'Free checker for NGOs. Paste a suspicious email, WhatsApp, SMS, link, phone number or sender address - or upload a screenshot.',
  placeholder: 'Paste a suspicious email, message, link, phone number or sender address here...',
  addScreenshot: 'Add a screenshot',
  screenshotHint: 'Drag & drop, paste, or choose a file. PNG / JPG / WebP up to 10 MB.',
  removeScreenshot: 'Remove screenshot',
  chooseFile: 'Choose file',
  checking: 'Checking...',
  checkNow: 'Check now',
  clear: 'Clear',
  tryExample: 'Try an example',
  exFee: 'Fake grant fee',
  exFcra: 'Fake FCRA notice',
  exBoss: 'Boss impersonation',
  exPhone: 'Phone number',
  verdictScam: 'Likely a scam',
  verdictSuspicious: 'Suspicious - verify first',
  verdictSafe: 'No strong scam signs',
  riskScore: 'Risk score',
  redFlags: 'Red flags found',
  links: 'Links in this message',
  riskyLink: 'risky - do not open',
  nextSteps: 'What to do next',
  extracted: 'Text read from your screenshot',
  aiUnavailable: 'AI review was unavailable, so this result is based on automated checks only.',
  reportTitle: 'Report a scam',
  reportSub: 'National Cyber Crime Reporting Portal',
  callTitle: 'Call 1930',
  callSub: 'Lost money? Call within the first hour if you can.',
  saathiSub: 'Report fraud calls / SMS (Chakshu)',
  disclaimer: 'Nothing you check is stored. This tool gives guidance, not a guarantee - always verify through official channels before you pay or share details.',
  errFileType: 'Please choose a PNG, JPG or WebP screenshot.',
  errFileSize: 'That image is over 10 MB. Try a smaller screenshot.',
  errRead: 'Could not read that image.',
  errEmpty: 'Paste a message, link, phone number or email - or add a screenshot.',
  errUnavailable: 'The checker is unavailable right now. Please try again.',
  errGeneric: 'Something went wrong.',
};

const hi: Partial<ScamLabels> = {
  heroCta: 'कोई संदिग्ध मैसेज मिला? जाँचें कि यह धोखाधड़ी तो नहीं',
  navLink: 'क्या यह धोखाधड़ी है? जाँचें',
  back: 'हब पर वापस जाएँ',
  badge: 'भरोसा न करें। पुष्टि करें।',
  title: 'क्या यह धोखाधड़ी है?',
  intro: 'एनजीओ के लिए मुफ़्त जाँच टूल। संदिग्ध ईमेल, WhatsApp, SMS, लिंक, फ़ोन नंबर या भेजने वाले का पता पेस्ट करें - या स्क्रीनशॉट अपलोड करें।',
  placeholder: 'संदिग्ध ईमेल, मैसेज, लिंक, फ़ोन नंबर या भेजने वाले का पता यहाँ पेस्ट करें...',
  addScreenshot: 'स्क्रीनशॉट जोड़ें',
  screenshotHint: 'ड्रैग करके छोड़ें, पेस्ट करें या फ़ाइल चुनें। PNG / JPG / WebP, 10 MB तक।',
  removeScreenshot: 'स्क्रीनशॉट हटाएँ',
  chooseFile: 'फ़ाइल चुनें',
  checking: 'जाँच हो रही है...',
  checkNow: 'अभी जाँचें',
  clear: 'साफ़ करें',
  tryExample: 'उदाहरण आज़माएँ',
  exFee: 'नकली अनुदान शुल्क',
  exFcra: 'नकली FCRA नोटिस',
  exBoss: 'बॉस बनकर ठगी',
  exPhone: 'फ़ोन नंबर',
  verdictScam: 'संभवतः धोखाधड़ी',
  verdictSuspicious: 'संदिग्ध - पहले पुष्टि करें',
  verdictSafe: 'धोखाधड़ी के स्पष्ट संकेत नहीं',
  riskScore: 'जोखिम स्कोर',
  redFlags: 'मिले खतरे के संकेत',
  links: 'इस मैसेज में लिंक',
  riskyLink: 'जोखिम भरा - न खोलें',
  nextSteps: 'आगे क्या करें',
  extracted: 'आपके स्क्रीनशॉट से पढ़ा गया टेक्स्ट',
  aiUnavailable: 'AI समीक्षा उपलब्ध नहीं थी, इसलिए यह परिणाम केवल स्वचालित जाँच पर आधारित है।',
  reportTitle: 'धोखाधड़ी की शिकायत करें',
  reportSub: 'राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल',
  callTitle: '1930 पर कॉल करें',
  callSub: 'पैसे गए? हो सके तो पहले घंटे में ही कॉल करें।',
  saathiSub: 'धोखाधड़ी वाले कॉल / SMS की शिकायत (चक्षु)',
  disclaimer: 'आप जो जाँचते हैं वह सेव नहीं होता। यह टूल मार्गदर्शन देता है, गारंटी नहीं - भुगतान करने या जानकारी साझा करने से पहले हमेशा आधिकारिक माध्यम से पुष्टि करें।',
  errFileType: 'कृपया PNG, JPG या WebP स्क्रीनशॉट चुनें।',
  errFileSize: 'यह इमेज 10 MB से बड़ी है। छोटा स्क्रीनशॉट आज़माएँ।',
  errRead: 'यह इमेज पढ़ी नहीं जा सकी।',
  errEmpty: 'मैसेज, लिंक, फ़ोन नंबर या ईमेल पेस्ट करें - या स्क्रीनशॉट जोड़ें।',
  errUnavailable: 'जाँच टूल अभी उपलब्ध नहीं है। कृपया फिर से कोशिश करें।',
  errGeneric: 'कुछ गड़बड़ हो गई।',
};

const mr: Partial<ScamLabels> = {
  heroCta: 'संशयास्पद मेसेज आला? तो फसवणूक आहे का ते तपासा',
  navLink: 'ही फसवणूक आहे का? तपासा',
  back: 'हबवर परत जा',
  badge: 'विश्वास ठेवू नका. खात्री करा.',
  title: 'ही फसवणूक आहे का?',
  intro: 'एनजीओसाठी मोफत तपासणी साधन. संशयास्पद ईमेल, WhatsApp, SMS, लिंक, फोन नंबर किंवा पाठवणाऱ्याचा पत्ता पेस्ट करा - किंवा स्क्रीनशॉट अपलोड करा.',
  placeholder: 'संशयास्पद ईमेल, मेसेज, लिंक, फोन नंबर किंवा पाठवणाऱ्याचा पत्ता येथे पेस्ट करा...',
  addScreenshot: 'स्क्रीनशॉट जोडा',
  screenshotHint: 'ड्रॅग करून सोडा, पेस्ट करा किंवा फाइल निवडा. PNG / JPG / WebP, 10 MB पर्यंत.',
  removeScreenshot: 'स्क्रीनशॉट काढा',
  chooseFile: 'फाइल निवडा',
  checking: 'तपासत आहे...',
  checkNow: 'आता तपासा',
  clear: 'साफ करा',
  tryExample: 'उदाहरण वापरून पाहा',
  exFee: 'बनावट अनुदान शुल्क',
  exFcra: 'बनावट FCRA नोटीस',
  exBoss: 'बॉस असल्याचे भासवणे',
  exPhone: 'फोन नंबर',
  verdictScam: 'बहुधा फसवणूक',
  verdictSuspicious: 'संशयास्पद - आधी खात्री करा',
  verdictSafe: 'फसवणुकीची ठळक चिन्हे नाहीत',
  riskScore: 'जोखीम गुण',
  redFlags: 'आढळलेली धोक्याची चिन्हे',
  links: 'या मेसेजमधील लिंक',
  riskyLink: 'धोकादायक - उघडू नका',
  nextSteps: 'पुढे काय करावे',
  extracted: 'तुमच्या स्क्रीनशॉटमधून वाचलेला मजकूर',
  aiUnavailable: 'AI पुनरावलोकन उपलब्ध नव्हते, त्यामुळे हा निकाल फक्त स्वयंचलित तपासणीवर आधारित आहे.',
  reportTitle: 'फसवणुकीची तक्रार करा',
  reportSub: 'राष्ट्रीय सायबर गुन्हे तक्रार पोर्टल',
  callTitle: '1930 वर कॉल करा',
  callSub: 'पैसे गेले? शक्य असल्यास पहिल्या तासातच कॉल करा.',
  saathiSub: 'फसवे कॉल / SMS ची तक्रार (चक्षु)',
  disclaimer: 'तुम्ही तपासलेले काहीही साठवले जात नाही. हे साधन मार्गदर्शन देते, हमी नाही - पैसे देण्यापूर्वी किंवा माहिती शेअर करण्यापूर्वी नेहमी अधिकृत मार्गाने खात्री करा.',
  errFileType: 'कृपया PNG, JPG किंवा WebP स्क्रीनशॉट निवडा.',
  errFileSize: 'ही इमेज 10 MB पेक्षा मोठी आहे. लहान स्क्रीनशॉट वापरून पाहा.',
  errRead: 'ही इमेज वाचता आली नाही.',
  errEmpty: 'मेसेज, लिंक, फोन नंबर किंवा ईमेल पेस्ट करा - किंवा स्क्रीनशॉट जोडा.',
  errUnavailable: 'तपासणी साधन सध्या उपलब्ध नाही. कृपया पुन्हा प्रयत्न करा.',
  errGeneric: 'काहीतरी चुकले.',
};

const ta: Partial<ScamLabels> = {
  heroCta: 'சந்தேகமான செய்தி வந்ததா? இது மோசடியா என்று சரிபாருங்கள்',
  navLink: 'இது மோசடியா? சரிபாருங்கள்',
  back: 'மையத்திற்குத் திரும்பு',
  badge: 'நம்ப வேண்டாம். சரிபாருங்கள்.',
  title: 'இது மோசடியா?',
  intro: 'என்ஜிஓக்களுக்கான இலவச சரிபார்ப்புக் கருவி. சந்தேகமான மின்னஞ்சல், WhatsApp, SMS, இணைப்பு, தொலைபேசி எண் அல்லது அனுப்புநர் முகவரியை ஒட்டுங்கள் - அல்லது ஸ்கிரீன்ஷாட்டைப் பதிவேற்றுங்கள்.',
  placeholder: 'சந்தேகமான மின்னஞ்சல், செய்தி, இணைப்பு, தொலைபேசி எண் அல்லது அனுப்புநர் முகவரியை இங்கே ஒட்டுங்கள்...',
  addScreenshot: 'ஸ்கிரீன்ஷாட் சேர்க்கவும்',
  screenshotHint: 'இழுத்து விடுங்கள், ஒட்டுங்கள் அல்லது கோப்பைத் தேர்ந்தெடுங்கள். PNG / JPG / WebP, 10 MB வரை.',
  removeScreenshot: 'ஸ்கிரீன்ஷாட்டை நீக்கு',
  chooseFile: 'கோப்பைத் தேர்ந்தெடு',
  checking: 'சரிபார்க்கிறது...',
  checkNow: 'இப்போது சரிபார்',
  clear: 'அழி',
  tryExample: 'ஒரு உதாரணத்தை முயலுங்கள்',
  exFee: 'போலி மானியக் கட்டணம்',
  exFcra: 'போலி FCRA அறிவிப்பு',
  exBoss: 'மேலாளர் போல் நடிப்பு',
  exPhone: 'தொலைபேசி எண்',
  verdictScam: 'மோசடியாக இருக்கலாம்',
  verdictSuspicious: 'சந்தேகமானது - முதலில் சரிபாருங்கள்',
  verdictSafe: 'வலுவான மோசடி அறிகுறிகள் இல்லை',
  riskScore: 'அபாய மதிப்பெண்',
  redFlags: 'கண்டறியப்பட்ட எச்சரிக்கை அறிகுறிகள்',
  links: 'இந்தச் செய்தியில் உள்ள இணைப்புகள்',
  riskyLink: 'அபாயம் - திறக்க வேண்டாம்',
  nextSteps: 'அடுத்து என்ன செய்வது',
  extracted: 'உங்கள் ஸ்கிரீன்ஷாட்டிலிருந்து படித்த உரை',
  aiUnavailable: 'AI மதிப்பாய்வு கிடைக்கவில்லை, எனவே இந்த முடிவு தானியங்கி சோதனைகளை மட்டுமே அடிப்படையாகக் கொண்டது.',
  reportTitle: 'மோசடியைப் புகாரளிக்கவும்',
  reportSub: 'தேசிய சைபர் குற்றப் புகார் இணையதளம்',
  callTitle: '1930-ஐ அழைக்கவும்',
  callSub: 'பணம் இழந்தீர்களா? முடிந்தால் முதல் ஒரு மணி நேரத்திற்குள் அழையுங்கள்.',
  saathiSub: 'மோசடி அழைப்புகள் / SMS புகாரளிக்க (சக்ஷு)',
  disclaimer: 'நீங்கள் சரிபார்ப்பவை எதுவும் சேமிக்கப்படுவதில்லை. இந்தக் கருவி வழிகாட்டுதல் மட்டுமே, உத்தரவாதம் அல்ல - பணம் செலுத்தும் முன் அல்லது விவரங்களைப் பகிரும் முன் அதிகாரப்பூர்வ வழிகளில் எப்போதும் சரிபாருங்கள்.',
  errFileType: 'PNG, JPG அல்லது WebP ஸ்கிரீன்ஷாட்டைத் தேர்ந்தெடுக்கவும்.',
  errFileSize: 'இந்தப் படம் 10 MB-க்கு மேல் உள்ளது. சிறிய ஸ்கிரீன்ஷாட்டை முயலுங்கள்.',
  errRead: 'இந்தப் படத்தைப் படிக்க முடியவில்லை.',
  errEmpty: 'செய்தி, இணைப்பு, தொலைபேசி எண் அல்லது மின்னஞ்சலை ஒட்டுங்கள் - அல்லது ஸ்கிரீன்ஷாட் சேர்க்கவும்.',
  errUnavailable: 'சரிபார்ப்புக் கருவி இப்போது கிடைக்கவில்லை. மீண்டும் முயலுங்கள்.',
  errGeneric: 'ஏதோ தவறு நடந்தது.',
};

const te: Partial<ScamLabels> = {
  heroCta: 'అనుమానాస్పద సందేశం వచ్చిందా? ఇది మోసమా అని తనిఖీ చేయండి',
  navLink: 'ఇది మోసమా? తనిఖీ చేయండి',
  back: 'హబ్‌కు తిరిగి వెళ్ళండి',
  badge: 'నమ్మకండి. ధృవీకరించండి.',
  title: 'ఇది మోసమా?',
  intro: 'ఎన్‌జీఓల కోసం ఉచిత తనిఖీ సాధనం. అనుమానాస్పద ఈమెయిల్, WhatsApp, SMS, లింక్, ఫోన్ నంబర్ లేదా పంపినవారి చిరునామాను పేస్ట్ చేయండి - లేదా స్క్రీన్‌షాట్ అప్‌లోడ్ చేయండి.',
  placeholder: 'అనుమానాస్పద ఈమెయిల్, సందేశం, లింక్, ఫోన్ నంబర్ లేదా పంపినవారి చిరునామాను ఇక్కడ పేస్ట్ చేయండి...',
  addScreenshot: 'స్క్రీన్‌షాట్ జోడించండి',
  screenshotHint: 'డ్రాగ్ చేసి వదలండి, పేస్ట్ చేయండి లేదా ఫైల్ ఎంచుకోండి. PNG / JPG / WebP, 10 MB వరకు.',
  removeScreenshot: 'స్క్రీన్‌షాట్ తీసివేయండి',
  chooseFile: 'ఫైల్ ఎంచుకోండి',
  checking: 'తనిఖీ చేస్తోంది...',
  checkNow: 'ఇప్పుడే తనిఖీ చేయండి',
  clear: 'క్లియర్',
  tryExample: 'ఒక ఉదాహరణ ప్రయత్నించండి',
  exFee: 'నకిలీ గ్రాంట్ రుసుము',
  exFcra: 'నకిలీ FCRA నోటీసు',
  exBoss: 'బాస్‌లా నటించడం',
  exPhone: 'ఫోన్ నంబర్',
  verdictScam: 'బహుశా మోసం',
  verdictSuspicious: 'అనుమానాస్పదం - ముందు ధృవీకరించండి',
  verdictSafe: 'బలమైన మోస సంకేతాలు లేవు',
  riskScore: 'ప్రమాద స్కోరు',
  redFlags: 'కనుగొన్న హెచ్చరిక సంకేతాలు',
  links: 'ఈ సందేశంలోని లింక్‌లు',
  riskyLink: 'ప్రమాదకరం - తెరవకండి',
  nextSteps: 'తర్వాత ఏమి చేయాలి',
  extracted: 'మీ స్క్రీన్‌షాట్ నుండి చదివిన వచనం',
  aiUnavailable: 'AI సమీక్ష అందుబాటులో లేదు, కాబట్టి ఈ ఫలితం స్వయంచాలక తనిఖీలపై మాత్రమే ఆధారపడింది.',
  reportTitle: 'మోసాన్ని నివేదించండి',
  reportSub: 'జాతీయ సైబర్ క్రైమ్ రిపోర్టింగ్ పోర్టల్',
  callTitle: '1930కి కాల్ చేయండి',
  callSub: 'డబ్బు పోయిందా? వీలైతే మొదటి గంటలోనే కాల్ చేయండి.',
  saathiSub: 'మోసపూరిత కాల్స్ / SMS నివేదించండి (చక్షు)',
  disclaimer: 'మీరు తనిఖీ చేసేది ఏదీ నిల్వ చేయబడదు. ఈ సాధనం మార్గదర్శకత్వం మాత్రమే ఇస్తుంది, హామీ కాదు - చెల్లించే ముందు లేదా వివరాలు పంచుకునే ముందు ఎల్లప్పుడూ అధికారిక మార్గాల ద్వారా ధృవీకరించండి.',
  errFileType: 'దయచేసి PNG, JPG లేదా WebP స్క్రీన్‌షాట్ ఎంచుకోండి.',
  errFileSize: 'ఈ చిత్రం 10 MB కంటే పెద్దది. చిన్న స్క్రీన్‌షాట్ ప్రయత్నించండి.',
  errRead: 'ఈ చిత్రాన్ని చదవలేకపోయాం.',
  errEmpty: 'సందేశం, లింక్, ఫోన్ నంబర్ లేదా ఈమెయిల్ పేస్ట్ చేయండి - లేదా స్క్రీన్‌షాట్ జోడించండి.',
  errUnavailable: 'తనిఖీ సాధనం ప్రస్తుతం అందుబాటులో లేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  errGeneric: 'ఏదో పొరపాటు జరిగింది.',
};

const bn: Partial<ScamLabels> = {
  heroCta: 'সন্দেহজনক মেসেজ পেয়েছেন? এটি প্রতারণা কি না যাচাই করুন',
  navLink: 'এটা কি প্রতারণা? যাচাই করুন',
  back: 'হাবে ফিরে যান',
  badge: 'বিশ্বাস নয়। যাচাই করুন।',
  title: 'এটা কি প্রতারণা?',
  intro: 'এনজিওদের জন্য বিনামূল্যের যাচাই টুল। সন্দেহজনক ইমেল, WhatsApp, SMS, লিংক, ফোন নম্বর বা প্রেরকের ঠিকানা পেস্ট করুন - অথবা স্ক্রিনশট আপলোড করুন।',
  placeholder: 'সন্দেহজনক ইমেল, মেসেজ, লিংক, ফোন নম্বর বা প্রেরকের ঠিকানা এখানে পেস্ট করুন...',
  addScreenshot: 'স্ক্রিনশট যোগ করুন',
  screenshotHint: 'টেনে এনে ছাড়ুন, পেস্ট করুন বা ফাইল বেছে নিন। PNG / JPG / WebP, 10 MB পর্যন্ত।',
  removeScreenshot: 'স্ক্রিনশট সরান',
  chooseFile: 'ফাইল বেছে নিন',
  checking: 'যাচাই করা হচ্ছে...',
  checkNow: 'এখনই যাচাই করুন',
  clear: 'মুছুন',
  tryExample: 'একটি উদাহরণ দেখুন',
  exFee: 'ভুয়া অনুদান ফি',
  exFcra: 'ভুয়া FCRA নোটিস',
  exBoss: 'বস সেজে প্রতারণা',
  exPhone: 'ফোন নম্বর',
  verdictScam: 'সম্ভবত প্রতারণা',
  verdictSuspicious: 'সন্দেহজনক - আগে যাচাই করুন',
  verdictSafe: 'প্রতারণার জোরালো লক্ষণ নেই',
  riskScore: 'ঝুঁকি স্কোর',
  redFlags: 'পাওয়া সতর্ক সংকেত',
  links: 'এই মেসেজের লিংক',
  riskyLink: 'ঝুঁকিপূর্ণ - খুলবেন না',
  nextSteps: 'এরপর কী করবেন',
  extracted: 'আপনার স্ক্রিনশট থেকে পড়া লেখা',
  aiUnavailable: 'AI পর্যালোচনা পাওয়া যায়নি, তাই এই ফলাফল শুধু স্বয়ংক্রিয় যাচাইয়ের উপর ভিত্তি করে।',
  reportTitle: 'প্রতারণার অভিযোগ করুন',
  reportSub: 'জাতীয় সাইবার অপরাধ রিপোর্টিং পোর্টাল',
  callTitle: '1930-এ কল করুন',
  callSub: 'টাকা খুইয়েছেন? সম্ভব হলে প্রথম এক ঘণ্টার মধ্যেই কল করুন।',
  saathiSub: 'প্রতারণামূলক কল / SMS রিপোর্ট করুন (চক্ষু)',
  disclaimer: 'আপনি যা যাচাই করেন তা সংরক্ষণ করা হয় না। এই টুল নির্দেশনা দেয়, গ্যারান্টি নয় - টাকা দেওয়ার বা তথ্য শেয়ার করার আগে সবসময় সরকারি মাধ্যমে যাচাই করুন।',
  errFileType: 'অনুগ্রহ করে PNG, JPG বা WebP স্ক্রিনশট বেছে নিন।',
  errFileSize: 'ছবিটি 10 MB-এর বেশি। ছোট স্ক্রিনশট দিয়ে চেষ্টা করুন।',
  errRead: 'ছবিটি পড়া গেল না।',
  errEmpty: 'মেসেজ, লিংক, ফোন নম্বর বা ইমেল পেস্ট করুন - অথবা স্ক্রিনশট যোগ করুন।',
  errUnavailable: 'যাচাই টুল এখন উপলব্ধ নয়। অনুগ্রহ করে আবার চেষ্টা করুন।',
  errGeneric: 'কিছু একটা ভুল হয়েছে।',
};

const gu: Partial<ScamLabels> = {
  heroCta: 'શંકાસ્પદ મેસેજ મળ્યો? તે છેતરપિંડી છે કે નહીં તે તપાસો',
  navLink: 'શું આ છેતરપિંડી છે? તપાસો',
  back: 'હબ પર પાછા જાઓ',
  badge: 'ભરોસો ન કરો. ખાતરી કરો.',
  title: 'શું આ છેતરપિંડી છે?',
  intro: 'એનજીઓ માટે મફત તપાસ સાધન. શંકાસ્પદ ઈમેલ, WhatsApp, SMS, લિંક, ફોન નંબર અથવા મોકલનારનું સરનામું પેસ્ટ કરો - અથવા સ્ક્રીનશોટ અપલોડ કરો.',
  placeholder: 'શંકાસ્પદ ઈમેલ, મેસેજ, લિંક, ફોન નંબર અથવા મોકલનારનું સરનામું અહીં પેસ્ટ કરો...',
  addScreenshot: 'સ્ક્રીનશોટ ઉમેરો',
  screenshotHint: 'ખેંચીને મૂકો, પેસ્ટ કરો અથવા ફાઇલ પસંદ કરો. PNG / JPG / WebP, 10 MB સુધી.',
  removeScreenshot: 'સ્ક્રીનશોટ દૂર કરો',
  chooseFile: 'ફાઇલ પસંદ કરો',
  checking: 'તપાસી રહ્યા છીએ...',
  checkNow: 'હમણાં તપાસો',
  clear: 'સાફ કરો',
  tryExample: 'એક ઉદાહરણ અજમાવો',
  exFee: 'નકલી ગ્રાન્ટ ફી',
  exFcra: 'નકલી FCRA નોટિસ',
  exBoss: 'બોસ હોવાનો ઢોંગ',
  exPhone: 'ફોન નંબર',
  verdictScam: 'સંભવતઃ છેતરપિંડી',
  verdictSuspicious: 'શંકાસ્પદ - પહેલાં ખાતરી કરો',
  verdictSafe: 'છેતરપિંડીના મજબૂત સંકેતો નથી',
  riskScore: 'જોખમ સ્કોર',
  redFlags: 'મળેલા ચેતવણી સંકેતો',
  links: 'આ મેસેજમાંની લિંક',
  riskyLink: 'જોખમી - ખોલશો નહીં',
  nextSteps: 'હવે શું કરવું',
  extracted: 'તમારા સ્ક્રીનશોટમાંથી વાંચેલું લખાણ',
  aiUnavailable: 'AI સમીક્ષા ઉપલબ્ધ ન હતી, તેથી આ પરિણામ ફક્ત સ્વચાલિત તપાસ પર આધારિત છે.',
  reportTitle: 'છેતરપિંડીની ફરિયાદ કરો',
  reportSub: 'રાષ્ટ્રીય સાયબર ક્રાઇમ રિપોર્ટિંગ પોર્ટલ',
  callTitle: '1930 પર કૉલ કરો',
  callSub: 'પૈસા ગુમાવ્યા? શક્ય હોય તો પહેલા કલાકમાં જ કૉલ કરો.',
  saathiSub: 'છેતરપિંડીવાળા કૉલ / SMS ની ફરિયાદ (ચક્ષુ)',
  disclaimer: 'તમે જે તપાસો છો તે સંગ્રહિત થતું નથી. આ સાધન માર્ગદર્શન આપે છે, ગેરંટી નહીં - ચુકવણી કરતા કે વિગતો શેર કરતા પહેલાં હંમેશા સત્તાવાર માધ્યમથી ખાતરી કરો.',
  errFileType: 'કૃપા કરીને PNG, JPG અથવા WebP સ્ક્રીનશોટ પસંદ કરો.',
  errFileSize: 'આ ઇમેજ 10 MB થી મોટી છે. નાનો સ્ક્રીનશોટ અજમાવો.',
  errRead: 'આ ઇમેજ વાંચી શકાઈ નહીં.',
  errEmpty: 'મેસેજ, લિંક, ફોન નંબર અથવા ઈમેલ પેસ્ટ કરો - અથવા સ્ક્રીનશોટ ઉમેરો.',
  errUnavailable: 'તપાસ સાધન હાલમાં ઉપલબ્ધ નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
  errGeneric: 'કંઈક ખોટું થયું.',
};

const kn: Partial<ScamLabels> = {
  heroCta: 'ಅನುಮಾನಾಸ್ಪದ ಸಂದೇಶ ಬಂದಿದೆಯೇ? ಇದು ವಂಚನೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ',
  navLink: 'ಇದು ವಂಚನೆಯೇ? ಪರಿಶೀಲಿಸಿ',
  back: 'ಹಬ್‌ಗೆ ಹಿಂತಿರುಗಿ',
  badge: 'ನಂಬಬೇಡಿ. ಪರಿಶೀಲಿಸಿ.',
  title: 'ಇದು ವಂಚನೆಯೇ?',
  intro: 'ಎನ್‌ಜಿಒಗಳಿಗಾಗಿ ಉಚಿತ ಪರಿಶೀಲನಾ ಸಾಧನ. ಅನುಮಾನಾಸ್ಪದ ಇಮೇಲ್, WhatsApp, SMS, ಲಿಂಕ್, ಫೋನ್ ಸಂಖ್ಯೆ ಅಥವಾ ಕಳುಹಿಸಿದವರ ವಿಳಾಸವನ್ನು ಅಂಟಿಸಿ - ಅಥವಾ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',
  placeholder: 'ಅನುಮಾನಾಸ್ಪದ ಇಮೇಲ್, ಸಂದೇಶ, ಲಿಂಕ್, ಫೋನ್ ಸಂಖ್ಯೆ ಅಥವಾ ಕಳುಹಿಸಿದವರ ವಿಳಾಸವನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿ...',
  addScreenshot: 'ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಸೇರಿಸಿ',
  screenshotHint: 'ಎಳೆದು ಬಿಡಿ, ಅಂಟಿಸಿ ಅಥವಾ ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ. PNG / JPG / WebP, 10 MB ವರೆಗೆ.',
  removeScreenshot: 'ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ತೆಗೆದುಹಾಕಿ',
  chooseFile: 'ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ',
  checking: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
  checkNow: 'ಈಗ ಪರಿಶೀಲಿಸಿ',
  clear: 'ತೆರವುಗೊಳಿಸಿ',
  tryExample: 'ಒಂದು ಉದಾಹರಣೆ ಪ್ರಯತ್ನಿಸಿ',
  exFee: 'ನಕಲಿ ಅನುದಾನ ಶುಲ್ಕ',
  exFcra: 'ನಕಲಿ FCRA ನೋಟಿಸ್',
  exBoss: 'ಬಾಸ್‌ನಂತೆ ನಟನೆ',
  exPhone: 'ಫೋನ್ ಸಂಖ್ಯೆ',
  verdictScam: 'ಬಹುಶಃ ವಂಚನೆ',
  verdictSuspicious: 'ಅನುಮಾನಾಸ್ಪದ - ಮೊದಲು ಪರಿಶೀಲಿಸಿ',
  verdictSafe: 'ವಂಚನೆಯ ಬಲವಾದ ಸೂಚನೆಗಳಿಲ್ಲ',
  riskScore: 'ಅಪಾಯದ ಅಂಕ',
  redFlags: 'ಕಂಡುಬಂದ ಎಚ್ಚರಿಕೆ ಸೂಚನೆಗಳು',
  links: 'ಈ ಸಂದೇಶದಲ್ಲಿರುವ ಲಿಂಕ್‌ಗಳು',
  riskyLink: 'ಅಪಾಯಕಾರಿ - ತೆರೆಯಬೇಡಿ',
  nextSteps: 'ಮುಂದೆ ಏನು ಮಾಡಬೇಕು',
  extracted: 'ನಿಮ್ಮ ಸ್ಕ್ರೀನ್‌ಶಾಟ್‌ನಿಂದ ಓದಿದ ಪಠ್ಯ',
  aiUnavailable: 'AI ಪರಿಶೀಲನೆ ಲಭ್ಯವಿರಲಿಲ್ಲ, ಆದ್ದರಿಂದ ಈ ಫಲಿತಾಂಶ ಸ್ವಯಂಚಾಲಿತ ಪರಿಶೀಲನೆಗಳನ್ನು ಮಾತ್ರ ಆಧರಿಸಿದೆ.',
  reportTitle: 'ವಂಚನೆಯನ್ನು ವರದಿ ಮಾಡಿ',
  reportSub: 'ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಅಪರಾಧ ವರದಿ ಪೋರ್ಟಲ್',
  callTitle: '1930ಗೆ ಕರೆ ಮಾಡಿ',
  callSub: 'ಹಣ ಕಳೆದುಕೊಂಡಿರಾ? ಸಾಧ್ಯವಾದರೆ ಮೊದಲ ಒಂದು ಗಂಟೆಯೊಳಗೆ ಕರೆ ಮಾಡಿ.',
  saathiSub: 'ವಂಚನೆ ಕರೆಗಳು / SMS ವರದಿ ಮಾಡಿ (ಚಕ್ಷು)',
  disclaimer: 'ನೀವು ಪರಿಶೀಲಿಸುವ ಯಾವುದನ್ನೂ ಸಂಗ್ರಹಿಸಲಾಗುವುದಿಲ್ಲ. ಈ ಸಾಧನ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ, ಖಾತರಿ ಅಲ್ಲ - ಹಣ ಪಾವತಿಸುವ ಅಥವಾ ವಿವರ ಹಂಚಿಕೊಳ್ಳುವ ಮೊದಲು ಯಾವಾಗಲೂ ಅಧಿಕೃತ ಮಾರ್ಗಗಳ ಮೂಲಕ ಪರಿಶೀಲಿಸಿ.',
  errFileType: 'ದಯವಿಟ್ಟು PNG, JPG ಅಥವಾ WebP ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಆಯ್ಕೆಮಾಡಿ.',
  errFileSize: 'ಈ ಚಿತ್ರ 10 MB ಗಿಂತ ದೊಡ್ಡದಾಗಿದೆ. ಚಿಕ್ಕ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಪ್ರಯತ್ನಿಸಿ.',
  errRead: 'ಈ ಚಿತ್ರವನ್ನು ಓದಲು ಆಗಲಿಲ್ಲ.',
  errEmpty: 'ಸಂದೇಶ, ಲಿಂಕ್, ಫೋನ್ ಸಂಖ್ಯೆ ಅಥವಾ ಇಮೇಲ್ ಅಂಟಿಸಿ - ಅಥವಾ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಸೇರಿಸಿ.',
  errUnavailable: 'ಪರಿಶೀಲನಾ ಸಾಧನ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  errGeneric: 'ಏನೋ ತಪ್ಪಾಗಿದೆ.',
};

const TABLE: Record<string, Partial<ScamLabels>> = { en, hi, mr, ta, te, bn, gu, kn };

export function scamLabels(lang: Language | string): ScamLabels {
  return { ...en, ...(TABLE[lang] || {}) } as ScamLabels;
}
