import React from 'react';
import HelperBot from './HelperBot';
import { FiMail, FiPhone } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                {/* Brand & Slogan */}
                <div className="footer-brand">
                    <img src="/logo.png" alt="WasteGo Logo" className="footer-logo" />
                    <h3 className="footer-title">Waste Go</h3>
                    <span className="footer-slogan">
                        Efficient pickups • Cleaner cities
                    </span>
                </div>

                {/* Copyright */}
                 <div className="footer-copyright">
                    &copy; {new Date().getFullYear()} WasteGo. All rights reserved.
                </div>
                
                {/* Contact */}
                <div className="footer-contact">
                    <span className="contact-item"><FiMail /> helplineWasteGo@gmail.com</span>
                    <span className="contact-item"><FiPhone /> +91 9996663330</span>
                </div>
            </div>

            {/* Helper Chat Bot */}
            <HelperBot />
        </footer>
    );
};

export default Footer;
