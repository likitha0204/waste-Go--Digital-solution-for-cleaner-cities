import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiX, FiMessageCircle, FiCpu } from 'react-icons/fi';
import './HelperBot.css';

const HelperBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hi there! 👋 I'm WasteGo Bot. I can help with pickups, complaints, or info about smart waste management.", isBot: true },
        { id: 2, text: "Try asking 'How does this site work?' or 'What is a smart city?'", isBot: true }
    ]);
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const textareaRef = useRef(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.continuous = false;
        recognition.lang = 'en-US';
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Auto-resize textarea when text changes (handles both typing and voice)
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [inputText]);

    const handleSpeech = () => {
        if (!recognition) {
            alert("Voice recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setIsListening(true);
            recognition.start();

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputText(transcript);
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };
        }
    };

    const handleSend = (e, textOverride = null) => {
        if (e) e.preventDefault();
        const text = textOverride || inputText;
        
        if (!text.trim()) return;

        // User Message
        const userMsg = { id: Date.now(), text: text, isBot: false };
        setMessages(prev => [...prev, userMsg]);
        setInputText("");

        // Bot Response Logic (Comprehensive Knowledge Base)
        setTimeout(() => {
            const lowerInput = userMsg.text.toLowerCase();
            let botResponseText = "";
            let shouldNavigate = null;

            // 1. Navigation Commands & Form Usage
            if (lowerInput.includes('report') || lowerInput.includes('complaint') || lowerInput.includes('issue')) {
                botResponseText = "I'm taking you to the Report Issue section. Please attach a photo of the waste.";
                shouldNavigate = '/dashboard/user'; 
            } else if (lowerInput.includes('schedule') || lowerInput.includes('pickup') || lowerInput.includes('book')) {
                botResponseText = "Redirecting to Schedule Pickup. Remember to classify your waste as Dry, Wet, or Hazardous.";
                shouldNavigate = '/dashboard/user';
            }

            // 2. "How to Use" / Website Guide
            else if (lowerInput.includes('how to use') || lowerInput.includes('steps') || lowerInput.includes('guide') || lowerInput.includes('work') || lowerInput.includes('help')) {
                botResponseText = "Here's how to use WasteGo: 1. Register/Login. 2. Go to your Dashboard. 3. Use 'Schedule Pickup' for your daily waste. 4. Use 'Report Issue' for public complaints. 5. Drivers will arrive based on your request!";
            }
            
            // 3. "About the Website" / Mission
            else if (lowerInput.includes('about') || lowerInput.includes('mission') || lowerInput.includes('created') || lowerInput.includes('website')) {
                botResponseText = "WasteGo is a Smart Waste Management System designed to create cleaner, smarter cities. We connect Residents, Drivers, and Admins to ensure efficient waste disposal and reduced pollution.";
            }

            // 4. Roles Explained
            else if (lowerInput.includes('admin') || lowerInput.includes('administrator')) {
                botResponseText = "Admins oversee the entire system, assign drivers, and monitor city-wide cleanliness.";
            } else if (lowerInput.includes('driver')) {
                botResponseText = "Drivers accept pickup tasks, view optimized routes, and update job status in real-time.";
            } else if (lowerInput.includes('organization') || lowerInput.includes('hospital')) {
                botResponseText = "Organizations can schedule recurring bulk pickups (e.g., daily medical waste collection).";
            }

            // 5. Environmental Awareness & Pollution
            else if (lowerInput.includes('pollution') || lowerInput.includes('environment') || lowerInput.includes('protect') || lowerInput.includes('clean city')) {
                botResponseText = "Improper waste disposal causes soil and water pollution. By segregating waste and using WasteGo, you reduce landfill overflow and greenhouse gas emissions. Let's save the planet together! 🌍";
            }
            else if (lowerInput.includes('smart city') || lowerInput.includes('iot')) {
                botResponseText = "In a smart city, technology like ours helps optimize resources. We reduce fuel usage by planning efficient routes for garbage trucks.";
            }

            // 6. Specific Waste Types
            else if (lowerInput.includes('garbage') || lowerInput.includes('waste') || lowerInput.includes('types') || lowerInput.includes('segregat')) {
                botResponseText = "Segregation is key! 🟢 Green Bin: Wet/Organic (Food). 🔵 Blue Bin: Dry/Recyclable (Paper, Plastic). 🔴 Red Bin: Hazardous (Medical, E-waste, Batteries).";
            } else if (lowerInput.includes('plastic') || lowerInput.includes('bottle')) {
                botResponseText = "Plastics take 500+ years to decompose! Please rinse bottles and place them in the Blue Bin for recycling.";
            } else if (lowerInput.includes('organic') || lowerInput.includes('food') || lowerInput.includes('compost')) {
                botResponseText = "Food scraps (Wet Waste) are excellent for composting. Use the Green Bin!";
            } else if (lowerInput.includes('medical') || lowerInput.includes('syringe') || lowerInput.includes('hazard')) {
                botResponseText = "⚠️ DANGER: Medical waste must be sealed in yellow/red bags and handled separately. Never mix with general trash.";
            } else if (lowerInput.includes('battery') || lowerInput.includes('batteries') || lowerInput.includes('e-waste')) {
                 botResponseText = "Batteries and electronics contain toxic chemicals. Please schedule a specialized 'E-waste' pickup.";
            }

            // 7. General Greetings
            else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
                botResponseText = "Hello! 👋 I'm your eco-friendly assistant. Ask me 'How to use the site' or about 'Plastic waste'!";
            } else if (lowerInput.includes('thank')) {
                botResponseText = "You're welcome! Keep it clean! ♻️";
            } else if (lowerInput.includes('bye')) {
                botResponseText = "Goodbye! Remember: Reduce, Reuse, Recycle! 🌱";
            } else {
                botResponseText = "I'm training on that topic! Try asking 'How to use the website', 'About WasteGo', or 'Where to throw batteries'.";
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, text: botResponseText, isBot: true }]);

            if (shouldNavigate) {
                navigate(shouldNavigate);
            }
        }, 600);
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="helper-bot-container">
            
            {/* Chat Window */}
            {isOpen && (
                <div className="chat-window">
                    {/* Header */}
                    <div className="chat-header">
                        <div className="bot-info">
                            <div>
                                <h4 style={{ display: 'flex', alignItems: 'center' }}>
                                    Helper Bot <span className="status-dot"></span>
                                </h4>
                            </div>
                        </div>
                        <button className="close-btn" onClick={toggleChat} title="Close Chat">
                            <FiX />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="messages-area">
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`message-row ${msg.isBot ? 'bot' : 'user'}`}
                            >
                                <div className={`message-bubble ${msg.isBot ? 'bot' : 'user'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="input-area">
                        <button 
                            type="button" 
                            onClick={handleSpeech}
                            className={`action-btn voice-btn ${isListening ? 'listening' : ''}`}
                            title="Speak"
                        >
                            {isListening ? <FiCpu style={{ animation: 'pulse 1s infinite' }} /> : <span style={{ fontSize: '1.2rem' }}>🎤</span>}
                        </button>
                        
                        <textarea 
                            ref={textareaRef}
                            className="message-input"
                            placeholder="Type a question..." 
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                e.target.style.height = 'auto'; // Reset height
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; // Expand up to max-height
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            rows={1}
                        />
                        
                        <button 
                            type="submit"
                            className="action-btn send-btn"
                            disabled={!inputText.trim()}
                        >
                            <FiSend style={{ marginLeft: '2px' }} />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button (FAB) */}
            <div 
                onClick={toggleChat}
                className={`toggle-btn ${isOpen ? 'open' : ''}`}
                title={isOpen ? "Close Chat" : "Open Helper Bot"}
            >
                <div className="toggle-icon">
                    {isOpen ? <FiX /> : <FiMessageCircle />}
                </div>
            </div>
        </div>
    );
};

export default HelperBot;
