import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CallCard, UseCase, PainPoint, Question } from '@/types/agent/call-card-create.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Save, X, Loader2, ChevronRight, Trash2, ChevronDown, ChevronUp, Expand } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Framework data structures
interface FrameworkQuestion {
  title: string;
  question: string;
}

interface SalesFramework {
  framework_name: string;
  framework_content: FrameworkQuestion[];
  framework_description: string;
}

// Predefined frameworks
const FRAMEWORKS: { [key: string]: SalesFramework } = {
  MEDDIC: {
    framework_name: "MEDDIC",
    framework_description: "A comprehensive sales qualification methodology",
    framework_content: [
      {
        title: "Metrics",
        question: "What measurable goals or KPIs are most important to you right now (e.g., revenue growth, cost reduction, productivity)?"
      },
      {
        title: "Economic Buyer",
        question: "Who is ultimately responsible for making the financial decision on this project or purchase?"
      },
      {
        title: "Decision Criteria",
        question: "What factors will you use to evaluate potential solutions and vendors?"
      },
      {
        title: "Decision Process",
        question: "Can you walk me through the steps you usually take when making a purchase like this?"
      },
      {
        title: "Identify Pain",
        question: "What challenges are you currently facing that are costing you time, money, or resources?"
      },
      {
        title: "Champion",
        question: "Who within your team is most motivated to solve this problem and would advocate for this solution internally?"
      }
    ]
  },
  BANT: {
    framework_name: "BANT",
    framework_description: "Budget, Authority, Need, Timeline qualification",
    framework_content: [
      {
        title: "Budget",
        question: "What's your budget for this project?"
      },
      {
        title: "Authority",
        question: "Who makes the final decision?"
      },
      {
        title: "Need",
        question: "What problem are you trying to solve?"
      },
      {
        title: "Timeline",
        question: "When do you need this implemented?"
      }
    ]
  }
};

interface CallCardEditorProps {
  template: CallCard;
  onSave: (template: CallCard, salesFramework?: SalesFramework) => Promise<void>;
  onCancel: () => void;
  isActive?: boolean;
  onSetActive?: (isActive: boolean) => Promise<void>;
  initialSalesFramework?: SalesFramework | null;
}

const CallCardEditor: React.FC<CallCardEditorProps> = ({
  template,
  onSave,
  onCancel,
  isActive = false,
  onSetActive,
  initialSalesFramework = null
}) => {
  const [editedTemplate, setEditedTemplate] = useState<CallCard>(template);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState(false);
  const [localIsActive, setLocalIsActive] = useState(isActive);
  const [activeTab, setActiveTab] = useState<'useCases' | 'painPoints'>('useCases');
  const [activeItemId, setActiveItemId] = useState<{ type: 'useCases' | 'painPoints'; id: string } | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [isFrameworkPopoverOpen, setIsFrameworkPopoverOpen] = useState<boolean>(false);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Update local state when prop changes
  useEffect(() => {
    setLocalIsActive(isActive);
  }, [isActive]);

  // Reset activeItemId when switching tabs
  useEffect(() => {
    setActiveItemId(null);
  }, [activeTab]);

  // Initialize selected framework from initialSalesFramework
  useEffect(() => {
    if (initialSalesFramework) {
      setSelectedFramework(initialSalesFramework.framework_name);
    }
  }, [initialSalesFramework]);

  const handleUpdateTemplate = (field: keyof CallCard, value: any) => {
    setEditedTemplate(prev => ({ ...prev, [field]: value }));
  };

  // Use Cases Management
  const handleAddUseCase = () => {
    const newUseCase: UseCase = {
      id: Date.now().toString(),
      title: '',
      description: '',
      questions: []
    };

    setEditedTemplate(prev => ({
      ...prev,
      useCases: [...prev.useCases, newUseCase]
    }));
  };

  const handleUpdateUseCase = (useCaseId: string, updates: Partial<UseCase>) => {
    setEditedTemplate(prev => ({
      ...prev,
      useCases: prev.useCases.map(uc => 
        uc.id === useCaseId ? { ...uc, ...updates } : uc
      )
    }));
  };

  const handleDeleteUseCase = (useCaseId: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      useCases: prev.useCases.filter(uc => uc.id !== useCaseId)
    }));
  };

  const handleAddUseCaseQuestion = (useCaseId: string) => {
    const newQuestion: Question = {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: ''
    };

    setEditedTemplate(prev => ({
      ...prev,
      useCases: prev.useCases.map(uc => 
        uc.id === useCaseId 
          ? { ...uc, questions: [...uc.questions, newQuestion] }
          : uc
      )
    }));
  };

  const handleUpdateUseCaseQuestion = (useCaseId: string, questionId: string, text: string) => {
    if (!useCaseId || !questionId) {
      console.error('Missing required IDs for updating use case question');
      return;
    }

    setEditedTemplate(prev => {
      // Find the specific use case
      const useCase = prev.useCases.find(uc => uc.id === useCaseId);
      if (!useCase) {
        console.error('Use case not found:', useCaseId);
        return prev;
      }

      // Find the specific question
      const questionIndex = useCase.questions.findIndex(q => q.id === questionId);
      if (questionIndex === -1) {
        console.error('Question not found:', questionId);
        return prev;
      }

      // Create new arrays with updated question
      const newQuestions = [...useCase.questions];
      newQuestions[questionIndex] = { ...newQuestions[questionIndex], text };

      const newUseCases = prev.useCases.map(uc =>
        uc.id === useCaseId ? { ...uc, questions: newQuestions } : uc
      );

      return { ...prev, useCases: newUseCases };
    });
  };

  const handleDeleteUseCaseQuestion = (useCaseId: string, questionId: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      useCases: prev.useCases.map(uc => 
        uc.id === useCaseId 
          ? { ...uc, questions: uc.questions.filter(q => q.id !== questionId) }
          : uc
      )
    }));
  };

  // Pain Points Management
  const handleAddPainPoint = () => {
    const newPainPoint: PainPoint = {
      id: Date.now().toString(),
      title: '',
      description: '',
      questions: []
    };

    setEditedTemplate(prev => ({
      ...prev,
      painPoints: [...prev.painPoints, newPainPoint]
    }));
  };

  const handleUpdatePainPoint = (painPointId: string, updates: Partial<PainPoint>) => {
    setEditedTemplate(prev => ({
      ...prev,
      painPoints: prev.painPoints.map(pp => 
        pp.id === painPointId ? { ...pp, ...updates } : pp
      )
    }));
  };

  const handleDeletePainPoint = (painPointId: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      painPoints: prev.painPoints.filter(pp => pp.id !== painPointId)
    }));
  };

  const handleAddPainPointQuestion = (painPointId: string) => {
    const newQuestion: Question = {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: ''
    };

    setEditedTemplate(prev => ({
      ...prev,
      painPoints: prev.painPoints.map(pp => 
        pp.id === painPointId 
          ? { ...pp, questions: [...pp.questions, newQuestion] }
          : pp
      )
    }));
  };

  const handleUpdatePainPointQuestion = (painPointId: string, questionId: string, text: string) => {
    if (!painPointId || !questionId) {
      console.error('Missing required IDs for updating pain point question');
      return;
    }

    setEditedTemplate(prev => {
      // Find the specific pain point
      const painPoint = prev.painPoints.find(pp => pp.id === painPointId);
      if (!painPoint) {
        console.error('Pain point not found:', painPointId);
        return prev;
      }

      // Find the specific question
      const questionIndex = painPoint.questions.findIndex(q => q.id === questionId);
      if (questionIndex === -1) {
        console.error('Question not found:', questionId);
        return prev;
      }

      // Create new arrays with updated question
      const newQuestions = [...painPoint.questions];
      newQuestions[questionIndex] = { ...newQuestions[questionIndex], text };

      const newPainPoints = prev.painPoints.map(pp =>
        pp.id === painPointId ? { ...pp, questions: newQuestions } : pp
      );

      return { ...prev, painPoints: newPainPoints };
    });
  };

  const handleDeletePainPointQuestion = (painPointId: string, questionId: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      painPoints: prev.painPoints.map(pp => 
        pp.id === painPointId 
          ? { ...pp, questions: pp.questions.filter(q => q.id !== questionId) }
          : pp
      )
    }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!editedTemplate.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (editedTemplate.useCases.length === 0 && editedTemplate.painPoints.length === 0) {
      toast.error('Add at least one use case or pain point');
      return;
    }

    // Validate use cases
    for (const useCase of editedTemplate.useCases) {
      if (!useCase.title.trim()) {
        toast.error('All use cases must have a title');
        return;
      }
    }

    // Validate pain points
    for (const painPoint of editedTemplate.painPoints) {
      if (!painPoint.title.trim()) {
        toast.error('All pain points must have a title');
        return;
      }
    }

    try {
      setIsSaving(true);
      const salesFramework = selectedFramework && selectedFramework !== 'none' ? FRAMEWORKS[selectedFramework] : undefined;
      await onSave(editedTemplate, salesFramework);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetActive = async () => {
    if (!onSetActive) return;

    try {
      setIsSettingActive(true);
      await onSetActive(!localIsActive);
      setLocalIsActive(!localIsActive);
    } catch (error) {
      console.error('Error setting active template:', error);
      toast.error('Failed to update active template');
    } finally {
      setIsSettingActive(false);
    }
  };

  const scrollToItem = (itemId: string, type: 'useCases' | 'painPoints') => {
    console.debug('Scrolling to item:', itemId, 'type:', type);
    const itemElement = itemRefs.current[itemId];
    if (itemElement) {
      itemElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveItemId({ type, id: itemId });
      console.debug('Set activeItemId to:', { type, id: itemId });
    } else {
      console.debug('Item element not found for ID:', itemId);
    }
  };

  const renderUseCases = useCallback(() => {
    return editedTemplate.useCases.map((useCase, index) => (
      <div 
        key={useCase.id}
        ref={el => itemRefs.current[useCase.id!] = el}
        className="relative"
      >
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Input
                  value={useCase.title}
                  onChange={(e) => handleUpdateUseCase(useCase.id!, { title: e.target.value })}
                  placeholder="Enter a title for this use case"
                  className="font-semibold text-lg border-none p-0 h-auto focus-visible:ring-0"
                />
                <Textarea
                  value={useCase.description}
                  onChange={(e) => handleUpdateUseCase(useCase.id!, { description: e.target.value })}
                  placeholder="Describe how this use case helps achieve the customer's goals..."
                  rows={2}
                  className="border-none p-0 focus-visible:ring-0 resize-none"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteUseCase(useCase.id!)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Follow-up Questions</h4>
                <Button
                  onClick={() => handleAddUseCaseQuestion(useCase.id!)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Follow-up Question
                </Button>
              </div>
              
              <div className="space-y-2">
                    {useCase.questions.map((question, questionIndex) => (
                  <div key={question.id} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">
                      {questionIndex + 1}.
                    </span>
                    <Input
                      key={`useCase-${useCase.id}-question-${question.id}`}
                      defaultValue={question.text}
                      onBlur={(e) => handleUpdateUseCaseQuestion(useCase.id!, question.id!, e.target.value)}
                      placeholder="Enter a follow-up question to understand this use case better"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUseCaseQuestion(useCase.id!, question.id!)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ));
  }, [editedTemplate.useCases]);

  const renderPainPoints = useCallback(() => {
    return editedTemplate.painPoints.map((painPoint, index) => (
      <div 
        key={painPoint.id}
        ref={el => itemRefs.current[painPoint.id!] = el}
        className="relative"
      >
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Input
                  value={painPoint.title}
                  onChange={(e) => handleUpdatePainPoint(painPoint.id!, { title: e.target.value })}
                  placeholder="Enter a title for this pain point"
                  className="font-semibold text-lg border-none p-0 h-auto focus-visible:ring-0"
                />
                <Textarea
                  value={painPoint.description}
                  onChange={(e) => handleUpdatePainPoint(painPoint.id!, { description: e.target.value })}
                  placeholder="Describe the challenges or problems the customer is facing..."
                  rows={2}
                  className="border-none p-0 focus-visible:ring-0 resize-none"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeletePainPoint(painPoint.id!)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Questions</h4>
                <Button
                  onClick={() => handleAddPainPointQuestion(painPoint.id!)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Question
                </Button>
              </div>
              
              <div className="space-y-2">
                    {painPoint.questions.map((question, questionIndex) => (
                  <div key={question.id} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">
                      {questionIndex + 1}.
                    </span>
                    <Input
                      key={`painPoint-${painPoint.id}-question-${question.id}`}
                      defaultValue={question.text}
                      onBlur={(e) => handleUpdatePainPointQuestion(painPoint.id!, question.id!, e.target.value)}
                      placeholder="Enter a question to understand this pain point better"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePainPointQuestion(painPoint.id!, question.id!)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ));
  }, [editedTemplate.painPoints]);

  return (
    <div className="flex h-full overflow-hidden max-w-[1600px] w-full mx-auto">
      {/* Side Index Bar */}
      <div className="w-80 border-r border-border bg-muted/30 flex-shrink-0">
        <ScrollArea className="h-full py-4">
          <div className="px-3 pb-2">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'useCases' | 'painPoints')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="useCases">Use Cases</TabsTrigger>
                <TabsTrigger value="painPoints">Pain Points</TabsTrigger>
              </TabsList>
              
              <TabsContent value="useCases" className="mt-0">
                <h4 className="mb-2 px-2 text-sm font-medium">Use Cases</h4>
                <div className="space-y-1">
                  {editedTemplate.useCases.map((useCase, index) => (
                    <button
                      key={useCase.id}
                      onClick={() => scrollToItem(useCase.id!, 'useCases')}
                      className={cn(
                        "w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        activeItemId?.type === 'useCases' && activeItemId?.id === useCase.id && "bg-accent text-accent-foreground"
                      )}
                    >
                      <span className="text-xs text-muted-foreground mt-0.5">{index + 1}.</span>
                      <span className="flex-1 text-left whitespace-normal leading-tight">{useCase.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="painPoints" className="mt-0">
                <h4 className="mb-2 px-2 text-sm font-medium">Pain Points</h4>
                <div className="space-y-1">
                  {editedTemplate.painPoints.map((painPoint, index) => (
                    <button
                      key={painPoint.id}
                      onClick={() => scrollToItem(painPoint.id!, 'painPoints')}
                      className={cn(
                        "w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        activeItemId?.type === 'painPoints' && activeItemId?.id === painPoint.id && "bg-accent text-accent-foreground"
                      )}
                    >
                      <span className="text-xs text-muted-foreground mt-0.5">{index + 1}.</span>
                      <span className="flex-1 text-left whitespace-normal leading-tight">{painPoint.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="py-4 px-8 pb-20">
            <div className="py-8 space-y-8">
              <Card className="shadow-sm border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl">Callcard Details</CardTitle>
                  <div>
                    {onSetActive && localIsActive && (
                      <Badge variant="secondary" className="bg-banana text-banana-foreground">
                        Active Callcard
                      </Badge>
                    )}
                    {onSetActive && !localIsActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSetActive}
                        disabled={isSettingActive || isSaving}
                        className="h-8"
                      >
                        Set as Active
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="template-name">Callcard Name</Label>
                        <Input
                          id="template-name"
                          value={editedTemplate.name}
                          onChange={(e) => handleUpdateTemplate('name', e.target.value)}
                          placeholder="Enter a name for your callcard"
                          disabled={isSaving}
                          className="border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sales-framework">Sales Framework (Optional)</Label>
                        <div className="flex gap-2">
                          <Select
                            value={selectedFramework}
                            onValueChange={setSelectedFramework}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 flex-1">
                              <SelectValue placeholder="Select a sales framework" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {Object.entries(FRAMEWORKS).map(([key, framework]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{framework.framework_name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Popover open={isFrameworkPopoverOpen} onOpenChange={setIsFrameworkPopoverOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="px-2"
                                      disabled={isSaving || !selectedFramework || selectedFramework === 'none'}
                                    >
                                      {isFrameworkPopoverOpen ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <Expand className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  {selectedFramework && selectedFramework !== 'none' && (
                                    <PopoverContent className="w-96 p-0" align="start">
                                      <ScrollArea className="max-h-96">
                                        <div className="p-4">
                                          <div className="mb-3">
                                            <h3 className="text-sm font-semibold text-foreground mb-2">
                                              {FRAMEWORKS[selectedFramework].framework_name} Questions
                                            </h3>
                                            <p className="text-xs text-muted-foreground mb-3">
                                              {FRAMEWORKS[selectedFramework].framework_description}
                                            </p>
                                          </div>
                                          
                                          <div className="space-y-1.5">
                                            {FRAMEWORKS[selectedFramework].framework_content.map((item, index) => {
                                              const defaultColors = [
                                                'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
                                                'bg-purple-500', 'bg-red-500', 'bg-indigo-500',
                                                'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
                                              ];
                                              const defaultLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                                              const color = defaultColors[index] || 'bg-gray-500';
                                              const letter = defaultLetters[index] || String.fromCharCode(65 + index);
                                              
                                              return (
                                                <Card key={index} className="border-border">
                                                  <CardContent className="p-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                      {/* Category Letter Badge */}
                                                      <div
                                                        className={`${color} text-white rounded w-7 h-7 flex items-center justify-center font-bold text-xs flex-shrink-0`}
                                                      >
                                                        {letter}
                                                      </div>

                                                      {/* Question Content */}
                                                      <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-xs leading-relaxed">
                                                          {item.title}: {item.question}
                                                        </h3>
                                                      </div>
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </ScrollArea>
                                    </PopoverContent>
                                  )}
                                </Popover>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {selectedFramework && selectedFramework !== 'none' 
                                    ? (isFrameworkPopoverOpen 
                                        ? `Hide ${FRAMEWORKS[selectedFramework].framework_name} Questions`
                                        : `View ${FRAMEWORKS[selectedFramework].framework_name} Questions`
                                      )
                                    : 'Select a framework to view questions'
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="template-description">Callcard Description</Label>
                      <Textarea
                        id="template-description"
                        value={editedTemplate.description}
                        onChange={(e) => handleUpdateTemplate('description', e.target.value)}
                        placeholder="Describe the purpose of this callcard"
                        rows={3}
                        disabled={isSaving}
                        className="border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'useCases' | 'painPoints')} className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Callcard Content</h3>
                  <div className="flex gap-2">
                    {activeTab === 'useCases' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddUseCase}
                        disabled={isSaving}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Use Case
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddPainPoint}
                        disabled={isSaving}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Pain Point
                      </Button>
                    )}
                  </div>
                </div>

                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="useCases">
                    Use Cases ({editedTemplate.useCases.length})
                  </TabsTrigger>
                  <TabsTrigger value="painPoints">
                    Pain Points ({editedTemplate.painPoints.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="useCases" className="mt-0">
                  <div className="space-y-4">
                    {editedTemplate.useCases.length === 0 ? (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground mb-4">No use cases yet</p>
                        <Button onClick={handleAddUseCase} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Use Case
                        </Button>
                      </Card>
                    ) : (
                      renderUseCases()
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="painPoints" className="mt-0">
                  <div className="space-y-4">
                    {editedTemplate.painPoints.length === 0 ? (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground mb-4">No pain points yet</p>
                        <Button onClick={handleAddPainPoint} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Pain Point
                        </Button>
                      </Card>
                    ) : (
                      renderPainPoints()
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-background border-t z-10 backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={onCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CallCardEditor);
