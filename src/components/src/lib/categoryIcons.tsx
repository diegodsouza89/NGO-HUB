import React from 'react';
import {
  Award, BadgeCheck, BarChart3, Bot, BookOpen, BrainCircuit, Building2, Cloud, Code2,
  Compass, CreditCard, Database, FileBarChart, FolderArchive, Globe, GraduationCap,
  HeartHandshake, HelpCircle, Image, Laptop, LineChart, Lock, Mail, Megaphone,
  MessageSquare, MonitorSmartphone, Palette, PenTool, PhoneCall, Receipt, Server,
  ShieldCheck, Smartphone, Sparkles, Terminal, Users, Video, Wrench,
} from 'lucide-react';

/**
 * The single list of icons a category may use.
 *
 * This used to live in two places that had drifted apart: CategoryList had a
 * switch statement of names it could draw, and CategoryManager had its own
 * six-item dropdown. The dropdown offered icons left over from when this site
 * was about compliance (Receipt, Award, FileBarChart), and several categories
 * were storing names the switch did not handle - so they rendered a grey
 * question mark on the public site.
 *
 * Both screens now read this file, which makes the two impossible to disagree:
 * every icon offered in the admin picker is one the public site can draw.
 */

interface IconEntry {
  Icon: React.ComponentType<{ className?: string }>;
  /** Tailwind colour for the public category card. */
  className: string;
  /** Grouping shown in the admin picker. */
  group: string;
}

export const CATEGORY_ICONS: Record<string, IconEntry> = {
  // Getting started
  Compass: { Icon: Compass, className: 'text-sky-600', group: 'Getting started' },
  BadgeCheck: { Icon: BadgeCheck, className: 'text-emerald-600', group: 'Getting started' },
  Award: { Icon: Award, className: 'text-amber-600', group: 'Getting started' },
  GraduationCap: { Icon: GraduationCap, className: 'text-orange-600', group: 'Getting started' },
  BookOpen: { Icon: BookOpen, className: 'text-blue-600', group: 'Getting started' },

  // Software and devices
  Laptop: { Icon: Laptop, className: 'text-purple-600', group: 'Software & devices' },
  MonitorSmartphone: { Icon: MonitorSmartphone, className: 'text-indigo-600', group: 'Software & devices' },
  Smartphone: { Icon: Smartphone, className: 'text-emerald-600', group: 'Software & devices' },
  Sparkles: { Icon: Sparkles, className: 'text-amber-500', group: 'Software & devices' },

  // Infrastructure
  Cloud: { Icon: Cloud, className: 'text-sky-500', group: 'Infrastructure' },
  Server: { Icon: Server, className: 'text-slate-600', group: 'Infrastructure' },
  Database: { Icon: Database, className: 'text-teal-600', group: 'Infrastructure' },
  Globe: { Icon: Globe, className: 'text-indigo-600', group: 'Infrastructure' },

  // Security
  ShieldCheck: { Icon: ShieldCheck, className: 'text-sky-600', group: 'Security' },
  Lock: { Icon: Lock, className: 'text-rose-600', group: 'Security' },

  // Design and communication
  Palette: { Icon: Palette, className: 'text-fuchsia-600', group: 'Design & outreach' },
  PenTool: { Icon: PenTool, className: 'text-pink-600', group: 'Design & outreach' },
  Image: { Icon: Image, className: 'text-violet-600', group: 'Design & outreach' },
  Video: { Icon: Video, className: 'text-red-500', group: 'Design & outreach' },
  Megaphone: { Icon: Megaphone, className: 'text-orange-600', group: 'Design & outreach' },
  PhoneCall: { Icon: PhoneCall, className: 'text-teal-600', group: 'Design & outreach' },
  MessageSquare: { Icon: MessageSquare, className: 'text-cyan-600', group: 'Design & outreach' },
  Mail: { Icon: Mail, className: 'text-blue-500', group: 'Design & outreach' },

  // Fundraising and people
  HeartHandshake: { Icon: HeartHandshake, className: 'text-rose-600', group: 'Fundraising & people' },
  Users: { Icon: Users, className: 'text-blue-600', group: 'Fundraising & people' },
  Building2: { Icon: Building2, className: 'text-stone-600', group: 'Fundraising & people' },
  CreditCard: { Icon: CreditCard, className: 'text-green-600', group: 'Fundraising & people' },
  Receipt: { Icon: Receipt, className: 'text-blue-600', group: 'Fundraising & people' },

  // Developer tools
  Code2: { Icon: Code2, className: 'text-violet-600', group: 'Developer & data' },
  Terminal: { Icon: Terminal, className: 'text-slate-700', group: 'Developer & data' },
  Wrench: { Icon: Wrench, className: 'text-amber-700', group: 'Developer & data' },
  BrainCircuit: { Icon: BrainCircuit, className: 'text-purple-600', group: 'Developer & data' },
  Bot: { Icon: Bot, className: 'text-purple-500', group: 'Developer & data' },

  // Measurement
  BarChart3: { Icon: BarChart3, className: 'text-indigo-600', group: 'Measurement' },
  LineChart: { Icon: LineChart, className: 'text-emerald-600', group: 'Measurement' },
  FileBarChart: { Icon: FileBarChart, className: 'text-indigo-600', group: 'Measurement' },
  FolderArchive: { Icon: FolderArchive, className: 'text-cyan-600', group: 'Measurement' },
};

/** Every selectable icon name, in the order the picker should show them. */
export const ICON_NAMES: string[] = Object.keys(CATEGORY_ICONS);

/** Icon names grouped for the admin picker, preserving the order above. */
export function iconGroups(): Array<{ group: string; names: string[] }> {
  const out: Array<{ group: string; names: string[] }> = [];
  for (const name of ICON_NAMES) {
    const group = CATEGORY_ICONS[name].group;
    const last = out[out.length - 1];
    if (last && last.group === group) last.names.push(name);
    else out.push({ group, names: [name] });
  }
  return out;
}

/**
 * Draw a category's icon. An unknown name falls back to a question mark rather
 * than crashing, which is what happens to content saved before this list
 * existed.
 */
export const CategoryIcon: React.FC<{ name: string; className?: string; colour?: boolean }> = ({
  name,
  className,
  colour = true,
}) => {
  const entry = CATEGORY_ICONS[name];
  const size = className || 'w-6 h-6';
  if (!entry) return <HelpCircle className={size + ' text-sky-600'} />;
  const { Icon } = entry;
  return <Icon className={colour ? size + ' ' + entry.className : size} />;
};
