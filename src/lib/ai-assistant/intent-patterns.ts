/**
 * Intent Patterns for AI Assistant
 * Supports Romanian (RO) and English (EN) commands
 */

export interface IntentPattern {
  id: string;
  patterns: {
    ro: RegExp[];
    en: RegExp[];
  };
  extractParams?: (text: string) => Record<string, any>;
}

// Navigation intent patterns
export const NAVIGATION_INTENTS: IntentPattern[] = [
  {
    id: 'nav.home',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?(?:acas[aă]|pagina\s+principal[aă]|dashboard)/i,
        /deschide\s+(?:pagina\s+)?(?:acas[aă]|principal[aă]|dashboard)/i,
        /arat[aă]-mi\s+dashboard/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:home|dashboard|main\s*page)/i,
        /show\s+(?:me\s+)?(?:the\s+)?dashboard/i,
      ]
    }
  },
  {
    id: 'nav.agents',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?agen[țt]i/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?agen[țt]i/i,
        /arat[aă]-mi\s+(?:to[țt]i\s+)?agen[țt]ii/i,
        /vezi\s+(?:lista\s+(?:de\s+)?)?agen[țt]i/i,
        /list[aă]\s+(?:de\s+)?agen[țt]i/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?agents?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?agents?/i,
        /list\s+(?:my\s+)?agents?/i,
        /view\s+agents?/i,
      ]
    }
  },
  {
    id: 'nav.workflow',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?workflow/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?workflow/i,
        /arat[aă]-mi\s+workflow(?:-urile)?/i,
        /automatiz[aă]ri/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?workflows?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?workflows?/i,
        /automations?/i,
      ]
    }
  },
  {
    id: 'nav.voices',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?voci/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?voci/i,
        /arat[aă]-mi\s+(?:toate\s+)?voc(?:ile|i)/i,
        /galeri[ae]\s+(?:de\s+)?voci/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?voices?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?voices?/i,
        /voice\s+gallery/i,
        /browse\s+voices?/i,
      ]
    }
  },
  {
    id: 'nav.analytics',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?(?:istoric(?:ul)?\s+(?:de\s+)?apeluri|analytics|analiz[aă])/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?(?:istoric|analytics|analiz[aă])/i,
        /arat[aă]-mi\s+(?:istoricul\s+(?:de\s+)?)?apeluri(?:le)?/i,
        /apeluri(?:le)?\s+(?:de\s+)?(?:ast[aă]zi|azi|ieri)/i,
        /ce\s+apeluri\s+(?:am\s+)?(?:avut|f[aă]cut)/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?(?:call\s+)?(?:history|analytics)/i,
        /show\s+(?:me\s+)?(?:today'?s?\s+)?(?:the\s+)?calls?/i,
        /(?:call|conversation)\s+(?:history|analytics)/i,
        /recent\s+calls?/i,
      ]
    }
  },
  {
    id: 'nav.transcripts',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?transcrieri/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?transcrieri/i,
        /arat[aă]-mi\s+transcrierile/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?transcripts?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?transcripts?/i,
      ]
    }
  },
  {
    id: 'nav.agent_analytic',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?agent\s+anali?ti?c/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?agent\s+anali?ti?c/i,
        /analiz[aă]\s+(?:pentru\s+)?agent/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?agent\s+analytics?/i,
        /show\s+(?:me\s+)?agent\s+analytics?/i,
      ]
    }
  },
  {
    id: 'nav.leads',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?leads?/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?leads?/i,
        /arat[aă]-mi\s+(?:toate\s+)?leads?(?:-urile)?/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?leads?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?leads?/i,
      ]
    }
  },
  {
    id: 'nav.files',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?fi[șs]iere/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?fi[șs]iere/i,
        /arat[aă]-mi\s+fi[șs]ierele/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?files?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:my\s+)?files?/i,
      ]
    }
  },
  {
    id: 'nav.integrations',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?integr[aă]ri/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?integr[aă]ri/i,
        /arat[aă]-mi\s+integr[aă]rile/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?integrations?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?integrations?/i,
      ]
    }
  },
  {
    id: 'nav.chat_widget',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?chat\s*widget/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?chat\s*widget/i,
        /configur(?:eaz[aă]|are)\s+widget/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?chat\s*widget(?:\s+page)?/i,
        /(?:configure|setup)\s+(?:the\s+)?widget/i,
      ]
    }
  },
  {
    id: 'nav.calendar',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?calendar/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?calendar/i,
        /arat[aă]-mi\s+calendarul/i,
        /program[aă]ri/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?calendar(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?calendar/i,
        /(?:my\s+)?(?:schedule|appointments)/i,
      ]
    }
  },
  {
    id: 'nav.phone_numbers',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?(?:numere(?:le)?\s+(?:de\s+)?telefon|telefoane)/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?(?:numere|telefoane)/i,
        /arat[aă]-mi\s+numerele/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?phone\s*numbers?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:my\s+)?phone\s*numbers?/i,
      ]
    }
  },
  {
    id: 'nav.outbound',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?(?:apeluri\s+(?:ie[șs]ire|outbound)|outbound|campanii)/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?(?:outbound|campanii|apeluri\s+ie[șs]ire)/i,
        /arat[aă]-mi\s+campaniile/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?(?:outbound(?:\s+calls?)?|campaigns?)(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?(?:outbound\s+)?campaigns?/i,
      ]
    }
  },
  {
    id: 'nav.contacts',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?contacte/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?contacte/i,
        /arat[aă]-mi\s+contactele/i,
        /list[aă]\s+(?:de\s+)?contacte/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?contacts?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:my\s+)?contacts?/i,
      ]
    }
  },
  {
    id: 'nav.settings',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?set[aă]ri/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?set[aă]ri/i,
        /arat[aă]-mi\s+set[aă]rile/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?settings?(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?settings?/i,
      ]
    }
  },
  {
    id: 'nav.pricing',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?(?:pre[țt]uri|abonamente|planuri)/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?(?:pre[țt]uri|abonamente)/i,
        /arat[aă]-mi\s+(?:pre[țt]urile|abonamentele)/i,
        /c[aâ]t\s+cost[aă]/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?(?:pricing|plans?)(?:\s+page)?/i,
        /show\s+(?:me\s+)?(?:the\s+)?(?:pricing|plans?)/i,
        /how\s+much\s+(?:does\s+it\s+)?cost/i,
      ]
    }
  },
  {
    id: 'nav.help',
    patterns: {
      ro: [
        /(?:du-m[aă]|mergi|navigh?eaz[aă]?)\s+(?:la\s+)?(?:ajutor|help)/i,
        /deschide\s+(?:pagina\s+(?:de\s+)?)?(?:ajutor|help)/i,
        /am\s+nevoie\s+de\s+ajutor/i,
      ],
      en: [
        /(?:go\s+(?:to\s+)?|navigate\s+(?:to\s+)?|open\s+)(?:the\s+)?help(?:\s+page)?/i,
        /(?:i\s+)?need\s+help/i,
      ]
    }
  },
];

// Agent action intent patterns
export const AGENT_INTENTS: IntentPattern[] = [
  {
    id: 'agent.create',
    patterns: {
      ro: [
        /cree?a?z[aă]?\s*(?:un\s+)?agent(?:\s+(?:nou|blank|gol))?/i,
        /f[aă][\s-]?mi\s+(?:un\s+)?agent/i,
        /vreau\s+(?:un\s+)?agent(?:\s+nou)?/i,
        /agent\s+nou/i,
        /adaug[aă]\s+(?:un\s+)?agent/i,
      ],
      en: [
        /create\s+(?:a\s+)?(?:new\s+)?agent/i,
        /make\s+(?:a\s+)?(?:new\s+)?agent/i,
        /new\s+agent/i,
        /add\s+(?:a\s+)?(?:new\s+)?agent/i,
        /set\s*up\s+(?:a\s+)?(?:new\s+)?agent/i,
      ]
    },
    extractParams: (text: string) => {
      // Extract agent name
      const nameMatch = text.match(/(?:numit|cu\s+numele|named?|called)\s+[\"']?([^\"',]+)[\"']?/i);
      const agentName = nameMatch ? nameMatch[1].trim() : 'Noul Meu Agent';

      // Detect agent type
      let agentType: 'blank' | 'website' | 'business' = 'blank';
      if (/website|site|web/i.test(text)) agentType = 'website';
      if (/business|afacere|companie|firma/i.test(text)) agentType = 'business';

      // Extract website URL
      const urlMatch = text.match(/https?:\/\/[^\s]+/i);

      return {
        agent_name: agentName,
        agent_type: agentType,
        website_url: urlMatch?.[0]
      };
    }
  },
  {
    id: 'agent.edit',
    patterns: {
      ro: [
        /editeaz[aă]\s+agent(?:ul)?/i,
        /modific[aă]\s+agent(?:ul)?/i,
        /schimb[aă]\s+(?:set[aă]rile\s+)?agent(?:ul(?:ui)?)?/i,
      ],
      en: [
        /edit\s+(?:the\s+)?agent/i,
        /modify\s+(?:the\s+)?agent/i,
        /change\s+(?:the\s+)?agent(?:'s)?\s*(?:settings)?/i,
      ]
    },
    extractParams: (text: string) => {
      const nameMatch = text.match(/agent(?:ul)?\s+[\"']?([^\"']+)[\"']?/i);
      return { agent_name: nameMatch?.[1]?.trim() };
    }
  },
  {
    id: 'agent.delete',
    patterns: {
      ro: [
        /[șs]terge\s+agent(?:ul)?/i,
        /elimin[aă]\s+agent(?:ul)?/i,
        /[îi]nl[aă]tur[aă]\s+agent(?:ul)?/i,
      ],
      en: [
        /delete\s+(?:the\s+)?agent/i,
        /remove\s+(?:the\s+)?agent/i,
      ]
    },
    extractParams: (text: string) => {
      const nameMatch = text.match(/agent(?:ul)?\s+[\"']?([^\"']+)[\"']?/i);
      return { agent_name: nameMatch?.[1]?.trim() };
    }
  },
  {
    id: 'agent.duplicate',
    patterns: {
      ro: [
        /duplic[aă]\s+agent(?:ul)?/i,
        /copiaz[aă]\s+agent(?:ul)?/i,
        /f[aă]\s+(?:o\s+)?copie\s+(?:la\s+)?agent/i,
      ],
      en: [
        /duplicate\s+(?:the\s+)?agent/i,
        /copy\s+(?:the\s+)?agent/i,
        /clone\s+(?:the\s+)?agent/i,
      ]
    }
  },
  {
    id: 'agent.test_call',
    patterns: {
      ro: [
        /(?:fa|faci|face?t?i?)\s+(?:un\s+)?(?:apel|call)\s+(?:de\s+)?test/i,
        /testeaz[aă]\s+(?:un\s+)?(?:apel|agent)/i,
        /apel\s+(?:de\s+)?test/i,
        /sun[aă]\s+agent(?:ul)?/i,
      ],
      en: [
        /(?:make|start)\s+(?:a\s+)?test\s+call/i,
        /test\s+(?:the\s+)?(?:call|agent)/i,
        /try\s+(?:a\s+)?call/i,
        /call\s+(?:the\s+)?agent/i,
      ]
    }
  },
  {
    id: 'agent.edit_name',
    patterns: {
      ro: [
        /schimb[aă]\s+numele\s+agent(?:ului)?/i,
        /redenume[șs]te\s+agent(?:ul)?/i,
        /(?:pune|seteaz[aă])\s+numele\s+agent(?:ului)?/i,
        /modific[aă]\s+numele\s+(?:la\s+)?agent(?:ul)?/i,
      ],
      en: [
        /change\s+(?:the\s+)?agent(?:'s)?\s+name/i,
        /rename\s+(?:the\s+)?agent/i,
        /set\s+(?:the\s+)?agent(?:'s)?\s+name/i,
        /modify\s+(?:the\s+)?agent(?:'s)?\s+name/i,
      ]
    },
    extractParams: (text: string) => {
      // Extract old agent name
      const oldNameMatch = text.match(/agent(?:ul)?\s+[\"']?([^\"']+?)[\\\"']?\s+(?:[îi]n|la|to)/i);
      // Extract new name
      const newNameMatch = text.match(/(?:[îi]n|la|to|named?)\s+[\"']?([^\"']+)[\\\"']?$/i);

      return {
        agent_name: oldNameMatch?.[1]?.trim(),
        new_name: newNameMatch?.[1]?.trim()
      };
    }
  },
  {
    id: 'agent.edit_prompt',
    patterns: {
      ro: [
        /schimb[aă]\s+(?:system\s+)?prompt(?:ul)?/i,
        /editeaz[aă]\s+(?:system\s+)?prompt(?:ul)?/i,
        /modific[aă]\s+(?:system\s+)?prompt(?:ul)?/i,
        /(?:pune|seteaz[aă])\s+(?:un\s+)?(?:alt\s+)?(?:system\s+)?prompt/i,
      ],
      en: [
        /change\s+(?:the\s+)?(?:system\s+)?prompt/i,
        /edit\s+(?:the\s+)?(?:system\s+)?prompt/i,
        /modify\s+(?:the\s+)?(?:system\s+)?prompt/i,
        /set\s+(?:a\s+)?(?:new\s+)?(?:system\s+)?prompt/i,
        /update\s+(?:the\s+)?(?:system\s+)?prompt/i,
      ]
    },
    extractParams: (text: string) => {
      // Extract agent name if mentioned
      const agentMatch = text.match(/(?:pentru|for|of)\s+agent(?:ul)?\s+[\"']?([^\"']+)[\\\"']?/i);
      // Extract new prompt if provided inline
      const promptMatch = text.match(/(?:[îi]n|la|to|cu)\s+[\"']([^\"']+)[\\\"']/i);

      return {
        agent_name: agentMatch?.[1]?.trim(),
        new_prompt: promptMatch?.[1]?.trim()
      };
    }
  },
  {
    id: 'agent.change_voice',
    patterns: {
      ro: [
        /schimb[aă]\s+vocea/i,
        /(?:pune|seteaz[aă])\s+(?:o\s+)?(?:alt[aă]\s+)?voce/i,
        /alege\s+(?:o\s+)?(?:alt[aă]\s+)?voce/i,
        /vreau\s+(?:o\s+)?(?:alt[aă]\s+)?voce/i,
      ],
      en: [
        /change\s+(?:the\s+)?voice/i,
        /set\s+(?:a\s+)?(?:different\s+)?voice/i,
        /select\s+(?:a\s+)?(?:new\s+)?voice/i,
        /(?:i\s+)?want\s+(?:a\s+)?(?:different\s+)?voice/i,
      ]
    },
    extractParams: (text: string) => {
      let voiceCriteria = '';
      if (/feminin[aă]?|female|woman/i.test(text)) voiceCriteria = 'female';
      if (/masculin[aă]?|male|man|b[aă]rbat/i.test(text)) voiceCriteria = 'male';

      // Extract agent name if mentioned
      const agentMatch = text.match(/(?:pentru|for|of)\s+agent(?:ul)?\s+[\"']?([^\"']+)[\\\"']?/i);

      return {
        voice_criteria: voiceCriteria,
        agent_name: agentMatch?.[1]?.trim()
      };
    }
  },
  {
    id: 'agent.toggle_status',
    patterns: {
      ro: [
        /(?:activeaz[aă]|dezactiveaz[aă]|opre[șs]te|porne[șs]te)\s+agent(?:ul)?/i,
        /(?:pune|seteaz[aă])\s+agent(?:ul)?\s+(?:pe|ca)\s+(?:activ|inactiv)/i,
      ],
      en: [
        /(?:activate|deactivate|enable|disable|turn\s+(?:on|off))\s+(?:the\s+)?agent/i,
        /set\s+(?:the\s+)?agent\s+(?:as\s+)?(?:active|inactive)/i,
      ]
    },
    extractParams: (text: string) => {
      const agentMatch = text.match(/agent(?:ul)?\s+[\"']?([^\"']+)[\\\"']?/i);
      const shouldActivate = /activeaz[aă]|porne[șs]te|activ|activate|enable|turn\s+on/i.test(text);

      return {
        agent_name: agentMatch?.[1]?.trim(),
        activate: shouldActivate
      };
    }
  },
  {
    id: 'agent.change_language',
    patterns: {
      ro: [
        /schimb[aă]\s+limba\s+(?:agent(?:ului)?|de\s+intrare)/i,
        /(?:pune|seteaz[aă])\s+(?:limba\s+)?(?:pe\s+)?(?:rom[aâ]n[aă]|englez[aă]|rus[aă])/i,
      ],
      en: [
        /change\s+(?:the\s+)?(?:agent(?:'s)?\s+)?(?:input\s+)?language/i,
        /set\s+(?:the\s+)?language\s+to/i,
      ]
    },
    extractParams: (text: string) => {
      let language = 'ro';
      if (/englez[aă]|english/i.test(text)) language = 'en';
      if (/rom[aâ]n[aă]|romanian/i.test(text)) language = 'ro';
      if (/rus[aă]|russian/i.test(text)) language = 'ru';
      return { language };
    }
  },
];

// Workflow action intent patterns
export const WORKFLOW_INTENTS: IntentPattern[] = [
  {
    id: 'workflow.create',
    patterns: {
      ro: [
        /cree?a?z[aă]?\s*(?:un\s+)?workflow/i,
        /f[aă][\s-]?mi\s+(?:un\s+)?workflow/i,
        /workflow\s+nou/i,
        /adaug[aă]\s+(?:un\s+)?workflow/i,
        /cree?a?z[aă]?\s*(?:o\s+)?automatizare/i,
      ],
      en: [
        /create\s+(?:a\s+)?(?:new\s+)?workflow/i,
        /make\s+(?:a\s+)?(?:new\s+)?workflow/i,
        /new\s+workflow/i,
        /add\s+(?:a\s+)?(?:new\s+)?(?:workflow|automation)/i,
      ]
    }
  },
  {
    id: 'workflow.delete',
    patterns: {
      ro: [
        /[șs]terge\s+workflow/i,
        /elimin[aă]\s+workflow/i,
      ],
      en: [
        /delete\s+(?:the\s+)?workflow/i,
        /remove\s+(?:the\s+)?workflow/i,
      ]
    }
  },
];

// Contact/Lead intent patterns
export const CONTACT_INTENTS: IntentPattern[] = [
  {
    id: 'contact.create',
    patterns: {
      ro: [
        /adaug[aă]\s+(?:un\s+)?contact/i,
        /cree?a?z[aă]?\s*(?:un\s+)?contact/i,
        /contact\s+nou/i,
      ],
      en: [
        /add\s+(?:a\s+)?(?:new\s+)?contact/i,
        /create\s+(?:a\s+)?(?:new\s+)?contact/i,
        /new\s+contact/i,
      ]
    }
  },
  {
    id: 'contact.import_csv',
    patterns: {
      ro: [
        /import[aă]?\s+(?:contacte?\s+)?(?:din\s+)?csv/i,
        /[îi]ncarc[aă]\s+(?:un\s+)?csv/i,
        /adaug[aă]\s+contacte?\s+din\s+(?:fi[șs]ier|csv)/i,
      ],
      en: [
        /import\s+(?:contacts?\s+)?(?:from\s+)?csv/i,
        /upload\s+(?:a\s+)?csv/i,
        /add\s+contacts?\s+from\s+(?:file|csv)/i,
      ]
    }
  },
  {
    id: 'lead.create',
    patterns: {
      ro: [
        /adaug[aă]\s+(?:un\s+)?lead/i,
        /cree?a?z[aă]?\s*(?:un\s+)?lead/i,
        /lead\s+nou/i,
      ],
      en: [
        /add\s+(?:a\s+)?(?:new\s+)?lead/i,
        /create\s+(?:a\s+)?(?:new\s+)?lead/i,
        /new\s+lead/i,
      ]
    }
  },
];

// Integration intent patterns
export const INTEGRATION_INTENTS: IntentPattern[] = [
  {
    id: 'integration.connect_google_sheets',
    patterns: {
      ro: [
        /conecteaz[aă]\s+google\s*sheets/i,
        /integreaz[aă]\s+(?:cu\s+)?google\s*sheets/i,
        /adaug[aă]\s+google\s*sheets/i,
        /activeaz[aă]\s+google\s*sheets/i,
      ],
      en: [
        /connect\s+(?:to\s+)?google\s*sheets/i,
        /integrate\s+(?:with\s+)?google\s*sheets/i,
        /(?:set\s*up|enable)\s+google\s*sheets/i,
      ]
    }
  },
  {
    id: 'integration.connect_zoho',
    patterns: {
      ro: [
        /conecteaz[aă]\s+zoho/i,
        /integreaz[aă]\s+(?:cu\s+)?zoho/i,
        /adaug[aă]\s+zoho/i,
      ],
      en: [
        /connect\s+(?:to\s+)?zoho/i,
        /integrate\s+(?:with\s+)?zoho/i,
        /(?:set\s*up|enable)\s+zoho/i,
      ]
    }
  },
  {
    id: 'webhook.create',
    patterns: {
      ro: [
        /cree?a?z[aă]?\s*(?:un\s+)?webhook/i,
        /adaug[aă]\s+(?:un\s+)?webhook/i,
        /configur(?:eaz[aă]|are)\s+webhook/i,
      ],
      en: [
        /create\s+(?:a\s+)?(?:new\s+)?webhook/i,
        /add\s+(?:a\s+)?webhook/i,
        /(?:configure|setup)\s+(?:a\s+)?webhook/i,
      ]
    }
  },
];

// Calendar intent patterns
export const CALENDAR_INTENTS: IntentPattern[] = [
  {
    id: 'calendar.create_event',
    patterns: {
      ro: [
        /programeaz[aă]\s+(?:un\s+)?(?:eveniment|apel|callback)/i,
        /adaug[aă]\s+(?:[îi]n\s+)?calendar/i,
        /cree?a?z[aă]?\s*(?:un\s+)?eveniment/i,
      ],
      en: [
        /schedule\s+(?:an?\s+)?(?:event|call|callback)/i,
        /add\s+(?:to\s+)?(?:the\s+)?calendar/i,
        /create\s+(?:an?\s+)?event/i,
      ]
    }
  },
];

// Outbound campaign intent patterns
export const OUTBOUND_INTENTS: IntentPattern[] = [
  {
    id: 'outbound.create_campaign',
    patterns: {
      ro: [
        /cree?a?z[aă]?\s*(?:o\s+)?campanie/i,
        /campanie\s+(?:nou[aă]|de\s+apeluri)/i,
        /sun[aă]\s+(?:mai\s+)?mul[țt]i\s+(?:clien[țt]i|contacte?)/i,
        /apeluri\s+(?:[îi]n\s+)?mas[aă]/i,
      ],
      en: [
        /create\s+(?:a\s+)?(?:new\s+)?(?:outbound\s+)?campaign/i,
        /new\s+(?:outbound\s+)?campaign/i,
        /call\s+multiple\s+(?:contacts?|people)/i,
        /(?:mass|bulk)\s+call(?:ing|s)?/i,
      ]
    }
  },
];

// Settings intent patterns
export const SETTINGS_INTENTS: IntentPattern[] = [
  {
    id: 'settings.change_ui_language',
    patterns: {
      ro: [
        /schimb[aă]\s+limba\s+(?:interfe[țt]ei|aplica[țt]iei|platformei)/i,
        /(?:pune|seteaz[aă])\s+(?:platforma\s+)?(?:pe|[îi]n)\s+(?:rom[aâ]n[aă]|englez[aă])/i,
        /vreau\s+(?:platforma\s+)?[îi]n\s+(?:rom[aâ]n[aă]|englez[aă])/i,
      ],
      en: [
        /change\s+(?:the\s+)?(?:ui|interface|app)\s+language/i,
        /set\s+(?:the\s+)?(?:platform|app)\s+(?:to|in)\s+(?:romanian|english)/i,
        /(?:i\s+)?want\s+(?:the\s+)?(?:app|platform)\s+in\s+(?:romanian|english)/i,
      ]
    },
    extractParams: (text: string) => {
      let language = 'ro';
      if (/englez[aă]|english/i.test(text)) language = 'en';
      if (/rom[aâ]n[aă]|romanian/i.test(text)) language = 'ro';
      return { language };
    }
  },
];

// Voice action intent patterns
export const VOICE_INTENTS: IntentPattern[] = [
  {
    id: 'voice.clone',
    patterns: {
      ro: [
        /cloneaz[aă]\s+(?:o\s+)?voce/i,
        /cree?a?z[aă]?\s*(?:o\s+)?voce\s+(?:proprie|personalizat[aă]|custom)/i,
        /f[aă][\s-]?mi\s+(?:o\s+)?voce/i,
      ],
      en: [
        /clone\s+(?:a\s+)?voice/i,
        /create\s+(?:a\s+)?(?:custom|personalized)\s+voice/i,
        /make\s+(?:my\s+)?(?:own\s+)?voice/i,
      ]
    }
  },
  {
    id: 'voice.play_sample',
    patterns: {
      ro: [
        /ascult[aă]\s+(?:o\s+)?(?:voce|mostr[aă])/i,
        /red[aă]\s+(?:o\s+)?voce/i,
        /auzi\s+(?:cum\s+sun[aă]\s+)?vocea/i,
      ],
      en: [
        /(?:play|listen\s+to)\s+(?:a\s+)?(?:voice|sample)/i,
        /hear\s+(?:the\s+)?voice/i,
        /preview\s+(?:a\s+)?voice/i,
      ]
    }
  },
];

// All intents combined
export const ALL_INTENTS: IntentPattern[] = [
  ...NAVIGATION_INTENTS,
  ...AGENT_INTENTS,
  ...WORKFLOW_INTENTS,
  ...CONTACT_INTENTS,
  ...INTEGRATION_INTENTS,
  ...CALENDAR_INTENTS,
  ...OUTBOUND_INTENTS,
  ...SETTINGS_INTENTS,
  ...VOICE_INTENTS,
];

/**
 * Detect language from text (Romanian or English)
 */
export function detectLanguage(text: string): 'ro' | 'en' {
  const roMarkers = ['ă', 'â', 'î', 'ș', 'ț', 'vreau', 'deschide', 'arată', 'creează', 'adaugă', 'șterge'];
  const enMarkers = ['the', 'show', 'open', 'create', 'please', 'want', 'make', 'add'];

  let roScore = 0;
  let enScore = 0;

  const lowerText = text.toLowerCase();

  for (const marker of roMarkers) {
    if (lowerText.includes(marker)) roScore++;
  }

  for (const marker of enMarkers) {
    if (lowerText.includes(marker)) enScore++;
  }

  return roScore >= enScore ? 'ro' : 'en';
}

/**
 * Detect intent from user message
 */
export function detectIntent(text: string): { id: string; params: Record<string, any> } | null {
  const language = detectLanguage(text);
  const normalizedText = text.toLowerCase().trim();

  for (const intent of ALL_INTENTS) {
    const patterns = intent.patterns[language] || intent.patterns.ro;

    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        const params = intent.extractParams ? intent.extractParams(text) : {};
        return {
          id: intent.id,
          params
        };
      }
    }
  }

  return null;
}
