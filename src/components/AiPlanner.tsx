import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIPlanner = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI travel planner. Tell me about your dream honeymoon - where would you like to go, what activities do you enjoy, and how long you\'re planning to travel?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call the Gemini API
      // For now, we'll simulate a response
      setTimeout(() => {
        const aiResponse: Message = {
          role: 'assistant',
          content: generateMockResponse(input)
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1500);
      
      // TODO: Replace with actual Gemini API call
      // const response = await fetch('/api/gemini', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ messages: [...messages, userMessage] })
      // });
      // const data = await response.json();
      // setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      
    } catch (error) {
      console.error('Error calling AI service:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again later.'
        }
      ]);
      setIsLoading(false);
    }
  };

  // Mock response generator - replace with actual Gemini API
  const generateMockResponse = (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('bali')) {
      return `Bali would be a perfect honeymoon destination! Here's a 7-day itinerary:

**Day 1-2: Ubud**
- Stay at the Four Seasons Resort Bali at Sayan
- Visit the Sacred Monkey Forest Sanctuary
- Enjoy a couples spa treatment
- Take a private Balinese cooking class

**Day 3-4: Uluwatu**
- Stay at Six Senses Uluwatu
- Watch the Kecak Fire Dance at Uluwatu Temple
- Relax at Padang Padang Beach
- Romantic dinner at a cliff-top restaurant

**Day 5-7: Seminyak**
- Stay at The Legian Bali
- Sunset cocktails at Potato Head Beach Club
- Shopping in Seminyak's boutiques
- Private beachfront dinner

Would you like me to adjust this itinerary or suggest alternative activities?`;
    } else if (lowerQuery.includes('italy') || lowerQuery.includes('amalfi')) {
      return `An Italian honeymoon along the Amalfi Coast is incredibly romantic! Here's a 10-day itinerary:

**Days 1-3: Rome**
- Stay at Hotel de Russie
- Visit the Colosseum and Vatican Museums
- Evening stroll through Trastevere
- Romantic dinner at a rooftop restaurant

**Days 4-6: Positano**
- Stay at Le Sirenuse
- Boat trip to Capri
- Beach day at Fornillo
- Dinner at La Sponda

**Days 7-10: Ravello**
- Stay at Belmond Hotel Caruso
- Visit Villa Rufolo and Villa Cimbrone
- Day trip to Pompeii
- Cooking class featuring local cuisine

Would you like more specific recommendations for any part of this itinerary?`;
    } else {
      return `Thank you for sharing your travel preferences! Based on what you've told me, I'd recommend considering these honeymoon destinations:

1. **Maldives** - Perfect for overwater bungalows and ultimate privacy
2. **Santorini, Greece** - Stunning views, white-washed buildings, and romantic sunsets
3. **Kyoto, Japan** - A blend of culture, history, and serene gardens
4. **Bora Bora** - Crystal clear waters and luxury resorts
5. **Amalfi Coast, Italy** - Charming coastal towns and incredible food

Would you like me to create a detailed itinerary for any of these destinations? Just let me know which one appeals to you most and how long you're planning to stay!`;
    }
  };

  return (
    <section id="planner" className="py-16 bg-travel-cream">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif font-bold mb-4 text-center">AI Honeymoon Planner</h2>
          <p className="text-center text-travel-charcoal/80 mb-12 max-w-2xl mx-auto">
            Tell our AI about your dream honeymoon, and we'll create a personalized itinerary just for you.
          </p>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Chat messages */}
            <div className="h-[500px] overflow-y-auto p-6 bg-white/50 backdrop-blur-sm">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-travel-green text-white'
                        : 'bg-gray-100 text-travel-charcoal'
                    }`}
                  >
                    <div className="whitespace-pre-line">{message.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mb-4 text-left">
                  <div className="inline-block rounded-2xl px-4 py-3 bg-gray-100">
                    <Loader2 className="h-5 w-5 animate-spin text-travel-green" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Tell me about your dream honeymoon..."
                  className="flex-1 border border-gray-300 rounded-l-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-travel-green focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className={`bg-travel-green text-white rounded-r-full p-3 ${
                    isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-travel-dark-green'
                  }`}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-travel-charcoal/60 mt-4">
            This AI planner provides suggestions based on your preferences. For a fully customized itinerary, please contact our travel specialists.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AIPlanner;
