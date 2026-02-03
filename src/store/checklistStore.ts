import { create } from 'zustand';
import { ChecklistItem, MeetingSection } from '@/types/meetingTemplates';

interface SectionState {
  checklist: ChecklistItem[];
  completedItems: ChecklistItem[];
}

interface TemplateContent {
  sections?: MeetingSection[];
  useCases?: Array<{
    id: string;
    title: string;
    description: string;
    questions: Array<{
      id: string;
      text: string;
    }>;
  }>;
  painPoints?: Array<{
    id: string;
    title: string;
    description: string;
    questions: Array<{
      id: string;
      text: string;
    }>;
  }>;
}

interface ChecklistState {
  sections: Record<string, SectionState>;
  currentSectionId: string | null;
  isCompletedOpen: boolean;
  originalTemplateContent: TemplateContent | null;

  initializeSections: (templateContent: TemplateContent | null) => void;
  setCurrentSectionId: (sectionId: string | null) => void;
  toggleItem: (itemId: string) => void;
  markItemsComplete: (ids: string[]) => void;
  resetSectionChecklist: (sectionId: string) => void;
  resetAllChecklists: () => void;
  setIsCompletedOpen: (isOpen: boolean) => void;
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  sections: {},
  currentSectionId: null,
  isCompletedOpen: false,
  originalTemplateContent: null,

  initializeSections: (templateContent) => {
    if (!templateContent) {
      set({
        sections: {},
        currentSectionId: null,
        isCompletedOpen: false,
        originalTemplateContent: null,
      });
      return;
    }

    const initialSections: Record<string, SectionState> = {};
    let firstSectionId: string | null = null;

    // Handle regular templates with sections
    if (templateContent.sections && templateContent.sections.length > 0) {
      templateContent.sections.forEach(section => {
        if (section.id) {
          initialSections[section.id] = {
            checklist: (section.questions || []).map(q => ({ ...q, checked: false })),
            completedItems: []
          };
          if (firstSectionId === null) {
            firstSectionId = section.id;
          }
        }
      });
    } 
    // Handle agent templates with useCases and painPoints
    else if ((templateContent.useCases && templateContent.useCases.length > 0) || 
             (templateContent.painPoints && templateContent.painPoints.length > 0)) {
      
      // Create a virtual section for useCases
      if (templateContent.useCases && templateContent.useCases.length > 0) {
        const useCaseSectionId = 'usecases-section';
        const useCaseQuestions = templateContent.useCases.flatMap(useCase => 
          (useCase.questions || []).map(q => ({
            id: q.id || `uc-${useCase.id}-${Math.random().toString(36).substring(2, 9)}`,
            text: q.text,
            checked: false
          }))
        );
        
        initialSections[useCaseSectionId] = {
          checklist: useCaseQuestions,
          completedItems: []
        };
        
        if (firstSectionId === null) {
          firstSectionId = useCaseSectionId;
        }
      }
      
      // Create a virtual section for painPoints
      if (templateContent.painPoints && templateContent.painPoints.length > 0) {
        const painPointSectionId = 'painpoints-section';
        const painPointQuestions = templateContent.painPoints.flatMap(painPoint => 
          (painPoint.questions || []).map(q => ({
            id: q.id || `pp-${painPoint.id}-${Math.random().toString(36).substring(2, 9)}`,
            text: q.text,
            checked: false
          }))
        );
        
        initialSections[painPointSectionId] = {
          checklist: painPointQuestions,
          completedItems: []
        };
        
        if (firstSectionId === null) {
          firstSectionId = painPointSectionId;
        }
      }
    } else {
      console.error('Invalid template structure:', templateContent);
      // Set empty state for invalid templates
      set({
        sections: {},
        currentSectionId: null,
        isCompletedOpen: false,
        originalTemplateContent: templateContent,
      });
      return;
    }

    set({
      sections: initialSections,
      currentSectionId: firstSectionId,
      isCompletedOpen: false,
      originalTemplateContent: templateContent,
    });
  },

  setCurrentSectionId: (sectionId) => {
    const currentState = get();
    if (currentState.sections[sectionId!]) {
        set({ currentSectionId: sectionId });
    } else if (sectionId === null) {
        set({ currentSectionId: null });
    }
  },

  toggleItem: (itemId: string) => {
    set((state) => {
      if (!state.currentSectionId || !state.sections[state.currentSectionId]) {
           return state;
      }
      
      const sectionId = state.currentSectionId;
      const section = state.sections[sectionId];
      const itemIndex = section.checklist.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
          return state;
      }

      const item = section.checklist[itemIndex];
      const newChecklist = [...section.checklist];
      newChecklist.splice(itemIndex, 1);

      const newCompletedItems = [...section.completedItems];
      if (!newCompletedItems.some(existing => existing.id === item.id)) {
          newCompletedItems.push({ ...item, checked: true });
      }

      return {
        sections: {
          ...state.sections,
          [sectionId]: {
            ...section,
            checklist: newChecklist,
            completedItems: newCompletedItems
          }
        },
        isCompletedOpen: !state.isCompletedOpen && newCompletedItems.length > 0 ? true : state.isCompletedOpen
      };
    });
  },

  markItemsComplete: (ids) => {
    set((state) => {
      const updatedSections = { ...state.sections };
      let shouldOpenCompleted = state.isCompletedOpen;
      let anySectionModified = false;

      Object.keys(updatedSections).forEach(sectionId => {
        const originalSection = state.sections[sectionId];
        let itemsToComplete: ChecklistItem[] = [];
        let sectionChanged = false;

        const newChecklist = originalSection.checklist.filter(item => {
          if (ids.includes(item.id)) {
            itemsToComplete.push({ ...item, checked: true });
            sectionChanged = true;
            return false;
          }
          return true;
        });

        if (sectionChanged) {
          anySectionModified = true;
          const newCompletedItems = [...originalSection.completedItems];
          itemsToComplete.forEach(itemToComplete => {
            if (!newCompletedItems.some(existing => existing.id === itemToComplete.id)) {
              newCompletedItems.push(itemToComplete);
            }
          });

          updatedSections[sectionId] = {
            checklist: newChecklist,
            completedItems: newCompletedItems,
          };

          if (!state.isCompletedOpen && newCompletedItems.length > 0) {
              shouldOpenCompleted = true;
          }
        }
      });

      if (!anySectionModified) {
        return state;
      }
      
      return {
        sections: updatedSections,
        isCompletedOpen: shouldOpenCompleted,
      };
    });
  },

  resetSectionChecklist: (sectionId) => {
    set((state) => {
        const originalSectionData = state.originalTemplateContent?.sections.find(s => s.id === sectionId);
        if (!originalSectionData || !state.sections[sectionId]) {
            return state;
        }

        return {
            sections: {
                ...state.sections,
                [sectionId]: {
                    checklist: (originalSectionData.questions || []).map(q => ({ ...q, checked: false })),
                    completedItems: []
                }
            },
            isCompletedOpen: state.currentSectionId === sectionId ? false : state.isCompletedOpen
        };
    });
  },

  resetAllChecklists: () => {
    set((state) => {
      if (!state.originalTemplateContent) {
        return { sections: {}, currentSectionId: null, isCompletedOpen: false };
      }

      // Re-initialize sections with the original template content
      // This will handle both regular templates and agent templates
      const { sections, currentSectionId } = state;
      
      // Create a new state with the same structure but reset all checklists
      const resetSections: Record<string, SectionState> = {};
      
      // For each section in the current state, reset its checklist
      Object.keys(sections).forEach(sectionId => {
        resetSections[sectionId] = {
          checklist: sections[sectionId].checklist.concat(sections[sectionId].completedItems)
            .map(item => ({ ...item, checked: false })),
          completedItems: []
        };
      });
      
      // Determine the new current section ID
      let newCurrentSectionId = null;
      
      // Keep the current section if it exists in the reset sections
      if (currentSectionId && resetSections[currentSectionId]) {
        newCurrentSectionId = currentSectionId;
      } 
      // Otherwise use the first section ID
      else if (Object.keys(resetSections).length > 0) {
        newCurrentSectionId = Object.keys(resetSections)[0];
      }

      return {
        sections: resetSections,
        currentSectionId: newCurrentSectionId,
        isCompletedOpen: false
      };
    });
  },

  setIsCompletedOpen: (isOpen) => {
    set({ isCompletedOpen: isOpen });
  }
})); 