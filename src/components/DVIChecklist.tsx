// src/components/DVIChecklist.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const checklistData = {
  "Exterior": ["Luces delanteras", "Luces traseras", "Plumillas", "Neumáticos", "Carrocería (rayones/abolladuras)"],
  "Interior": ["Nivel de combustible", "Luces del tablero", "Aire acondicionado", "Radio", "Tapicería"],
  "Bajo el Capó": ["Nivel de aceite", "Nivel de refrigerante", "Líquido de frenos", "Batería y terminales", "Filtro de aire"],
  "Bajo el Vehículo": ["Sistema de escape", "Suspensión", "Frenos (visual)", "Fugas de fluidos"],
};

type ChecklistState = {
  [category: string]: {
    [item: string]: {
      checked: boolean;
      notes: string;
    };
  };
};

export function DVIChecklist() {
  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    const initialState: ChecklistState = {};
    Object.entries(checklistData).forEach(([category, items]) => {
      initialState[category] = {};
      items.forEach(item => {
        initialState[category][item] = { checked: false, notes: '' };
      });
    });
    return initialState;
  });

  const handleCheckChange = (category: string, item: string, checked: boolean) => {
    setChecklist(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [item]: { ...prev[category][item], checked },
      },
    }));
  };
  
  const handleNoteChange = (category: string, item: string, notes: string) => {
    setChecklist(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [item]: { ...prev[category][item], notes },
      },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de Inspección</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["Exterior"]} className="w-full">
          {Object.entries(checklistData).map(([category, items]) => (
            <AccordionItem value={category} key={category}>
              <AccordionTrigger>{category}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`${category}-${item}`} 
                          checked={checklist[category][item].checked}
                          onCheckedChange={(checked) => handleCheckChange(category, item, !!checked)}
                        />
                        <Label htmlFor={`${category}-${item}`}>{item}</Label>
                      </div>
                      <Input
                        placeholder="Anotaciones..."
                        className="h-8 text-sm"
                        value={checklist[category][item].notes}
                        onChange={(e) => handleNoteChange(category, item, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
