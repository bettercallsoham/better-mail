import Link from "next/link";
import { Twitter, Linkedin, Github, Mail } from "lucide-react";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="relative w-full bg-white border-t border-neutral-200 overflow-hidden">
      {/* Footer Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 font-sans md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Image
                  src={"/logo.png"}
                  className=""
                  width={100}
                  height={100}
                  alt="BetterMail Logo"
                />
              </div>
              <span className="text-xl font-bold text-neutral-900">
                BetterMail
              </span>
            </Link>
            <p className="text-neutral-600 text-sm leading-relaxed mb-6 max-w-xs">
              The AI-powered email assistant for busy professionals. Built for
              productivity and peace of mind.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://linkedin.com/in/thegeekyabhi"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/nerdyabhi/bettermail"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="mailto:admin@bettermail.tech"
                className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-neutral-900 mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/features"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/integrations"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Integrations
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-neutral-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-neutral-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} BetterMail Inc. All rights reserved.
          </p>
          <p className="text-sm text-neutral-500 flex items-center gap-1">
            Made with <span className="text-red-500">♥</span> by BetterMail Team
          </p>
        </div>
        {/* Faded Background Text */}
        <div className=" z-20  w-full h-full  inset-0 flex items-center justify-center pointer-events-none select-none">
          <h1
            className="text-[4rem] md:text-[12rem] bg-clip-text text-center  bg-linear-to-b from-neutral-200 via-neutral-100  to-transparent text-transparent lg:text-[14rem] font-sans font-medium tracking-normal leading-none whitespace-nowrap"
            aria-hidden="true"
          >
            BETTERMAIL
          </h1>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
