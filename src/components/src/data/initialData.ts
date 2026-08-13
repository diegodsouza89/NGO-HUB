import { Category, Article, SiteSettings, User, LoginLog } from '../types';

export const INITIAL_SETTINGS: SiteSettings = {
  siteName: "NGO Knowledge Hub",
  tagline: "A centralized technology and digital operations portal for non-profit organizations, grassroots leaders, and social impact teams.",
  supportEmail: "",
  helplinePhone: "",
  ga4Id: "G-NGO98765432",
  adminPasswordHash: "changeme123",
  primaryLanguage: "en",
  logoUrl: "",
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat-tech-grants",
    slug: "ngo-tech-stack-and-software-grants",
    icon: "Laptop",
    order: 1,
    names: {
      en: "NGO Tech Stack & Software Grants",
      hi: "एनजीओ टेक स्टैक और सॉफ्टवेयर अनुदान",
      mr: "एनजीओ तंत्रज्ञान आणि सॉफ्टवेअर अनुदान",
      ta: "தொண்டு நிறுவன மென்பொருள் மானியங்கள்",
      te: "ఎన్‌జీఓ సాఫ్ట్‌వేర్ గ్రాంట్లు",
      bn: "এনজিও টেক স্ট্যাক ও সফটওয়্যার অনুদান",
      gu: "એનજીઓ ટેક સ્ટેક અને સોફ્ટવેર ગ્રાન્ટ્સ",
      kn: "ಎನ್‌ಜಿಒ ತಂತ್ರಜ್ಞಾನ ತಂತ್ರಾಂಶ ಅನುದಾನ",
    },
    descriptions: {
      en: "A focused guide to software grants, nonprofit tool access, and digital setup for NGOs.",
      hi: "एनजीओ के लिए सॉफ्टवेयर अनुदान, टूल एक्सेस और डिजिटल सेटअप का केंद्रित मार्गदर्शक।",
      mr: "एनजीओसाठी सॉफ्टवेअर अनुदान आणि डिजिटल सेटअप मार्गदर्शक.",
      ta: "தொண்டு நிறுவனங்களுக்கான மென்பொருள் மானியங்கள் மற்றும் டிஜிட்டல் அமைப்புகள்.",
      te: "ఎన్‌జీఓలకు సాఫ్ట్‌వేర్ గ్రాంట్లు మరియు డిజిటల్ సెటప్ గైడ్.",
      bn: "এনজিওদের জন্য সফটওয়্যার অনুদান ও ডিজিটাল সেটআপ গাইড।",
      gu: "એનજીઓ માટે સોફ્ટવેર ગ્રાન્ટ્સ અને ડિજિટલ સેટઅપ માર્ગદર્શિકા.",
      kn: "ಎನ್‌ಜಿಒಗಳಿಗೆ ತಂತ್ರಾಂಶ ಅನುದಾನ ಮತ್ತು ಡಿಜಿಟಲ್ ತಂತ್ರಜ್ಞಾನ ಮಾರ್ಗದರ್ಶಿ.",
    },
  },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: "res-107",
    slug: "complete-ngo-tech-grant-guide",
    categoryId: "cat-tech-grants",
    resourceType: "guide",
    published: true,
    views: 2450,
    downloadsCount: 890,
    bookmarkCount: 410,
    helpfulYes: 295,
    helpfulNo: 4,
    updatedAt: "2026-08-05",
    tags: ["Tech Grants", "Google for Nonprofits", "Canva", "Microsoft 365", "TechSoup"],
    sector: "Digital & Tech",
    downloadUrl: "https://example.org/downloads/NGO_Tech_Grants_Access_Handbook_2026.pdf",
    fileType: "PDF Tech Handbook",
    fileSize: "3.8 MB",
    titles: {
      en: "Complete NGO Tech Grant Guide",
      hi: "संपूर्ण एनजीओ टेक ग्रांट गाइड",
      mr: "संपूर्ण एनजीओ टेक ग्रांट गाइड",
    },
    bodies: {
      en: `### NGO Tech Stack Guide

This guide focuses on the tools NGOs actually need to run digital operations efficiently: free productivity software, collaboration platforms, design tools, cloud storage, and nonprofit licensing programs.

---

### Core Tech Stack Areas

1. **Google for Nonprofits**
   - Workspace access for business email, drive, docs, meet, and cloud collaboration.

2. **Microsoft Nonprofit Programs**
   - Microsoft 365 licensing and cloud productivity resources.

3. **Canva for Nonprofits**
   - Design support for reports, presentations, and social visuals.

4. **TechSoup India**
   - Discounted software and access to practical digital tools.

---

### Recommended Starting Point

Use this guide to identify which tools can save staff time, improve workflows, and reduce software costs for the organization.`,
      hi: `### एनजीओ टेक स्टैक गाइड

यह गाइड उन टूल्स पर केंद्रित है जो एनजीओ को डिजिटल रूप से कुशलता से चलाने में मदद करते हैं: मुफ्त उत्पादकता सॉफ्टवेयर, सहयोग प्लेटफ़ॉर्म, डिज़ाइन टूल, क्लाउड स्टोरेज और नॉनप्रॉफ़िट लाइसेंसिंग प्रोग्राम।`,
    },
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: "usr-1001",
    name: "Priya Sharma",
    email: "priya.sharma@samparkfoundation.org",
    organizationName: "Sampark Rural Development Foundation",
    role: "Executive Director",
    sector: "Education & Rural Development",
    registeredAt: "2026-07-10T10:15:00Z",
    lastLoginAt: "2026-08-06T18:30:00Z",
    loginCount: 14,
    pageViewsCount: 42,
    downloadsCount: 8,
    savedResourceIds: ["res-107"],
    status: "active",
  },
  {
    id: "usr-1002",
    name: "Dr. Rajesh Kulkarni",
    email: "rajesh@aarogyatrust.org",
    organizationName: "Aarogya Public Health Trust",
    role: "Program Manager",
    sector: "Healthcare",
    registeredAt: "2026-07-18T14:20:00Z",
    lastLoginAt: "2026-08-05T11:45:00Z",
    loginCount: 9,
    pageViewsCount: 28,
    downloadsCount: 5,
    savedResourceIds: ["res-107"],
    status: "active",
  },
];

export const INITIAL_LOGIN_LOGS: LoginLog[] = [
  {
    id: "log-501",
    userId: "usr-1001",
    userName: "Priya Sharma",
    userEmail: "priya.sharma@samparkfoundation.org",
    organizationName: "Sampark Rural Development Foundation",
    role: "Executive Director",
    timestamp: Date.now() - 3600000 * 4,
    date: new Date().toISOString().split('T')[0],
    device: "Chrome / macOS Desktop",
  },
  {
    id: "log-502",
    userId: "usr-1002",
    userName: "Dr. Rajesh Kulkarni",
    userEmail: "rajesh@aarogyatrust.org",
    organizationName: "Aarogya Public Health Trust",
    role: "Program Manager",
    timestamp: Date.now() - 3600000 * 8,
    date: new Date().toISOString().split('T')[0],
    device: "Safari / iPhone iOS",
  },
];
