"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionContextType = {
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
};

const AccordionContext = React.createContext<AccordionContextType | undefined>(
  undefined
);

const useAccordionContext = () => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
};

type AccordionProps = {
  children: React.ReactNode;
  className?: string;
  defaultOpen?: string;
};

function Accordion({ children, className, defaultOpen }: AccordionProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(
    defaultOpen || null
  );

  return (
    <AccordionContext.Provider value={{ openItem, setOpenItem }}>
      <div className={cn("space-y-2 cursor-pointer", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = {
  children: React.ReactNode;
  value: string;
  className?: string;
};

function AccordionItem({ children, value, className }: AccordionItemProps) {
  const { openItem, setOpenItem } = useAccordionContext();
  const isOpen = openItem === value;

  const toggleOpen = () => {
    setOpenItem(isOpen ? null : value);
  };

  return (
    <div
      className={cn(
        "rounded-xl cursor-pointer bg-white border-b border-b-neutral-300 overflow-hidden transition-all duration-200",
        isOpen && "shadow-sm border-neutral-300",
        className
      )}
    >
      <AccordionItemContext.Provider value={{ isOpen, toggleOpen }}>
        {children}
      </AccordionItemContext.Provider>
    </div>
  );
}

type AccordionItemContextType = {
  isOpen: boolean;
  toggleOpen: () => void;
};

const AccordionItemContext = React.createContext<
  AccordionItemContextType | undefined
>(undefined);

const useAccordionItemContext = () => {
  const context = React.useContext(AccordionItemContext);
  if (!context) {
    throw new Error("AccordionButton/Panel must be used within AccordionItem");
  }
  return context;
};

type AccordionButtonProps = {
  children: React.ReactNode;
  className?: string;
};

function AccordionButton({ children, className }: AccordionButtonProps) {
  const { isOpen, toggleOpen } = useAccordionItemContext();

  return (
    <button
      onClick={toggleOpen}
      className={cn(
        "flex items-center cursor-pointer justify-between w-full px-6 py-4 text-left transition-colors",
        "hover:bg-neutral-50 focus:outline-none focus:bg-neutral-50",
        className
      )}
    >
      <span className="font-semibold text-neutral-900 text-sm md:text-base pr-4">
        {children}
      </span>
      <ChevronDown
        className={cn(
          "flex-shrink-0 w-5 h-5 text-neutral-500 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

type AccordionPanelProps = {
  children: React.ReactNode;
  className?: string;
};

function AccordionPanel({ children, className }: AccordionPanelProps) {
  const { isOpen } = useAccordionItemContext();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "px-6 pb-5 pt-0 text-neutral-600 text-sm leading-relaxed",
              className
            )}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// FAQ DATA
// ============================================

const FAQ_ITEMS = [
  {
    id: "what-is",
    question: "What is BetterMail and how does it work?",
    answer:
      "BetterMail is an AI-powered email assistant that helps you manage your inbox more efficiently. It automatically drafts replies, schedules meetings, extracts tasks, and organizes your emails using advanced AI. Simply connect your email account, and our AI starts learning your communication style to provide personalized assistance.",
  },
  {
    id: "providers",
    question: "Which email providers do you support?",
    answer:
      "We currently support Gmail, Outlook, and Yahoo Mail. You can connect multiple accounts from different providers and manage them all in one unified inbox. More providers are coming soon!",
  },
  {
    id: "security",
    question: "Is my email data secure and private?",
    answer:
      "Absolutely. We take security seriously. All data is encrypted in transit and at rest using industry-standard encryption. We never sell your data to third parties, and you can delete your account and all associated data at any time. Our AI processes emails locally and only stores minimal metadata needed for functionality.",
  },
  {
    id: "trial",
    question: "Do you offer a free trial?",
    answer:
      "Yes! We offer a 14-day free trial with full access to all features. No credit card required. After the trial, you can choose a plan that fits your needs or continue with our free tier that includes basic AI features.",
  },
  {
    id: "integrations",
    question: "What integrations do you support?",
    answer:
      "BetterMail integrates seamlessly with popular productivity tools including Notion, Slack, Google Meet, and Telegram. Create tasks in Notion from emails, get notifications in Slack, schedule meetings in Google Meet, and more. We're constantly adding new integrations based on user feedback.",
  },
  {
    id: "ai-style",
    question: "Can the AI really understand my writing style?",
    answer:
      "Yes! Our AI learns from your past emails to match your tone, vocabulary, and communication style. It gets better over time as you use the app. You can also review and edit any AI-generated content before sending, ensuring it always sounds like you.",
  },
  {
    id: "setup",
    question: "How quickly can I get started?",
    answer:
      "Setup takes less than 2 minutes. Simply sign up, connect your email account via OAuth (secure, no password sharing), and you're ready to go. Our AI immediately starts analyzing your inbox and providing smart suggestions.",
  },
  {
    id: "cancel",
    question: "What happens to my emails if I cancel my subscription?",
    answer:
      "You retain full access to your email accounts through their native providers. BetterMail only enhances your email experience but never holds your emails hostage. If you cancel, you can export any data or simply disconnect, and your emails remain in your original inbox.",
  },
];

export default function FAQ() {
  return (
    <section className="w-full py-16 md:py-24 bg-linear-to-b from-white to-neutral-50">
      <div className="max-w-3xl mx-auto  px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 to-neutral-400 dark:from-neutral-50 dark:to-neutral-400 text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-instrument leading-tight">
           Frequently Asked Questions
          </h1>

          <p className="text-neutral-600 text-base md:text-lg">
            Everything you need to know about BetterMail
          </p>
        </div>

        {/* FAQ Accordion - Consistent width, no expansion */}
        <Accordion defaultOpen="what-is">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionButton>{item.question}</AccordionButton>
              <AccordionPanel>{item.answer}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
