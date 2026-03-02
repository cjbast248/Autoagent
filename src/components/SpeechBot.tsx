"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const SpeechBot: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleGenerateSpeech = async () => {
        if (!inputText.trim()) {
            alert('Please enter some text to generate speech.');
            return;
        }

        setIsLoading(true);
        try {
            // Call Supabase Edge Function for Eleven Labs integration
            const response = await fetch('/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: inputText }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate speech: ${response.status} - ${errorText}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play();
            } else {
                const newAudio = new Audio(audioUrl);
                newAudio.play();
            }

        } catch (error: any) {
            console.error('Error generating speech:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const sectionVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.section
            id="elevenlabs-bot"
            className="py-20 bg-gradient-to-br from-background via-muted/20 to-accent/10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={sectionVariants}
            transition={{ duration: 0.8 }}
        >
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                        Transformă Textul în Voce cu AI
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Experimentează puterea Eleven Labs! Introdu orice text, iar AI-ul nostru avansat îl va transforma într-o voce naturală, de înaltă calitate. Perfect pentru demo-uri rapide sau mesaje personalizate.
                    </p>
                </motion.div>

                <div className="max-w-3xl mx-auto">
                    <Card className="bg-card/50 backdrop-blur-sm border shadow-2xl">
                        <CardContent className="p-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Textul de transformat în voce
                                    </label>
                                    <Textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Scrie aici textul pe care vrei să-l transformi în voce naturală folosind tehnologia Eleven Labs..."
                                        className="min-h-[150px] resize-none bg-background/50 border-muted focus:border-primary transition-colors"
                                        disabled={isLoading}
                                    />
                                </div>

                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        onClick={handleGenerateSpeech}
                                        disabled={isLoading || !inputText.trim()}
                                        className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Generez vocea...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-5 w-5" />
                                                Generează Voce cu AI
                                            </>
                                        )}
                                    </Button>
                                </motion.div>

                                <div className="pt-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-center"
                                    >
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Audio generat cu Eleven Labs AI
                                        </p>
                                        <audio 
                                            ref={audioRef} 
                                            controls 
                                            className="w-full max-w-md mx-auto rounded-lg"
                                            style={{ 
                                                filter: 'sepia(0) saturate(1) hue-rotate(200deg) brightness(1) contrast(1)',
                                                background: 'hsl(var(--muted))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                    </motion.div>
                                </div>
                            </motion.div>
                        </CardContent>
                    </Card>
                </div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="grid md:grid-cols-3 gap-6 mt-16"
                >
                    {[
                        {
                            title: "Voce Naturală",
                            description: "AI avansat care creează voci ultra-realiste și expresive",
                            icon: "🎤"
                        },
                        {
                            title: "Procesare Rapidă", 
                            description: "Generare instantanee de audio de înaltă calitate",
                            icon: "⚡"
                        },
                        {
                            title: "Calitate Premium",
                            description: "Audio crisp și clar, perfect pentru orice utilizare",
                            icon: "🎵"
                        }
                    ].map((feature, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="text-center p-6 bg-card/30 backdrop-blur-sm border-muted hover:border-primary/50 transition-colors">
                                <CardContent className="p-0">
                                    <div className="text-3xl mb-4">{feature.icon}</div>
                                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </motion.section>
    );
};

export default SpeechBot;