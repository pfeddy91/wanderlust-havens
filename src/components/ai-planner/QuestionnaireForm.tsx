import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import { QuestionnaireAnswers } from '@/types/aiPlanner';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// Input might not be needed if no text inputs are defined in DB
// import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react'; // Import all icons
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  // DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import {
    fetchQuestionnaireData,
    fetchCollectionsForExplainer, // Import collections fetcher
    QuestionnaireQuestion,
    QuestionOption,
    FetchedCollection
} from '@/services/questionnaireService'; // Adjust path
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import FlipCard from '@/components/ui/FlipCard'; // Import the new component
import { Textarea } from "@/components/ui/textarea"; // Added: Import Textarea component
// Remove Progress import if no longer needed
// import { Progress } from "@/components/ui/progress";

// --- Constants for Session Storage ---
const SESSION_STORAGE_STEP_KEY = 'questionnaireStep';
const SESSION_STORAGE_ANSWERS_KEY = 'questionnaireAnswers';

// --- Dynamic Icon Helper ---
// Map icon names (string) to actual Lucide components
const iconMap: { [key: string]: React.ComponentType<LucideIcons.LucideProps> } = {
  Waves: LucideIcons.Waves,
  MountainSnow: LucideIcons.MountainSnow,
  Castle: LucideIcons.Castle,
  Drama: LucideIcons.Drama,
  Blend: LucideIcons.Blend,
  Snail: LucideIcons.Snail,
  TrainFront: LucideIcons.TrainFront,
  UtensilsCrossed: LucideIcons.UtensilsCrossed,
  Sprout: LucideIcons.Sprout,
  Palette: LucideIcons.Palette,
  PlaneTakeoff: LucideIcons.PlaneTakeoff,
  Info: LucideIcons.Info,
  Moon: LucideIcons.Moon,
  CheckCircle2: LucideIcons.CheckCircle2,
  Globe: LucideIcons.Globe,
  Sailboat: LucideIcons.Sailboat,
  Map: LucideIcons.Map,
  Building2: LucideIcons.Building2,
  Trees: LucideIcons.Trees,
  SunMedium: LucideIcons.SunMedium,
  HelpCircle: LucideIcons.HelpCircle,
  Binoculars: LucideIcons.Binoculars,
  Landmark: LucideIcons.Landmark,
  Mountain: LucideIcons.Mountain,
  Sparkles: LucideIcons.Sparkle,
  Users: LucideIcons.Users,
  Amphora: LucideIcons.Amphora,
  Wine: LucideIcons.Wine,
  Sun: LucideIcons.Sun
  
};

interface DynamicIconProps extends LucideIcons.LucideProps {
  name: string | null | undefined;
}

const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  if (!name || !iconMap[name]) {
    // Return a default icon or null if name is invalid/missing
    return <LucideIcons.HelpCircle {...props} />;
  }
  const IconComponent = iconMap[name];
  return <IconComponent {...props} />;
};
// --- End Dynamic Icon Helper ---


interface QuestionnaireFormProps {
  onSubmit: (data: QuestionnaireAnswers) => void;
}

// Define the shape of our multi-step form data dynamically
// We'll use Record<string, any> as keys come from DB
type Inputs = Record<string, any>; // More flexible

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// Remove hardcoded option arrays (experienceOptions, regionOptions)

// Type for the currently viewed option in the dialog
type ViewedOptionType = QuestionOption | null;

// Define a fallback background image URL in case a question doesn't have one
const FALLBACK_BACKGROUND_IMAGE_URL = 'https://images.pexels.com/photos/5008878/pexels-photo-5008878.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

// --- Temporary Icon Mapping for Step 1 ---
// const step1IconMapping: Record<string, string> = { ... }; // No longer needed

const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  // Use refs to track if initial load is done to prevent effect loops
  const isInitialLoadDone = useRef(false);
  const hasRestoredState = useRef(false);

  // --- State Initialization with Session Storage ---
  const [currentStep, setCurrentStep] = useState<number>(() => {
      const savedStep = sessionStorage.getItem(SESSION_STORAGE_STEP_KEY);
      return savedStep ? parseInt(savedStep, 10) : 1; // Start at saved step or 1
  });
  const [durationValue, setDurationValue] = useState<number>(() => {
    const savedAnswersStr = sessionStorage.getItem(SESSION_STORAGE_ANSWERS_KEY);
    if (savedAnswersStr) {
        try {
            const savedAnswers = JSON.parse(savedAnswersStr);
            if (Array.isArray(savedAnswers.duration) && savedAnswers.duration.length > 0) {
                return savedAnswers.duration[0];
            }
        } catch { /* Ignore parsing error */ }
    }
    return 14; // Updated to center the slider (7-21 range)
  });
  const [budgetValue, setBudgetValue] = useState<number>(() => {
    const savedAnswersStr = sessionStorage.getItem(SESSION_STORAGE_ANSWERS_KEY);
    if (savedAnswersStr) {
        try {
            const savedAnswers = JSON.parse(savedAnswersStr);
            if (typeof savedAnswers.budget_range === 'number') {
                return savedAnswers.budget_range;
            }
        } catch { /* Ignore parsing error */ }
    }
    return 20000; // Default £20k max budget
  });
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [viewedOption, setViewedOption] = useState<ViewedOptionType>(null);

  // --- STATE FOR LAYOUT TESTING ---
  // Set to 3 to test this layout for Step 3
  // const [step3LayoutVariant, setStep3LayoutVariant] = useState<1 | 2 | 3>(1);
  // --- END STATE ---

  // --- Fetch Questionnaire Data ---
  const { data: questionnaireData, isLoading: isLoadingQuestions, error: questionsError } = useQuery<QuestionnaireQuestion[]>({
    queryKey: ['questionnaireData'],
    queryFn: fetchQuestionnaireData,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes instead of forever
    refetchOnWindowFocus: false,
  });

  // --- Fetch Collection Data for Explainer ---
   const { data: collectionsData, isLoading: isLoadingCollections } = useQuery<FetchedCollection[]>({
       queryKey: ['collectionsForExplainer'],
       queryFn: fetchCollectionsForExplainer,
       staleTime: 1000 * 60 * 5, // Cache for 5 minutes or longer
       enabled: !!questionnaireData?.find(q => q.form_key === 'vibe' && q.explainer_trigger_text), // Only fetch if vibe explainer exists
   });

  const TOTAL_STEPS = questionnaireData?.length ?? 0;

  // --- Setup Form ---
  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    watch,
    setValue,
    reset, // Get reset function from useForm
    formState: { errors }, // isValid might be less reliable with dynamic fields
  } = useForm<Inputs>({
    mode: 'onChange',
    defaultValues: useMemo(() => {
        const defaults: Inputs = {};
         if (!hasRestoredState.current && questionnaireData) {
            questionnaireData.forEach(q => {
                if (q.question_type === 'slider' && q.form_key === 'duration') {
                    defaults[q.form_key] = [q.validation_rules?.default ?? 14];
            } else if (q.question_type.includes('multi_select')) {
                defaults[q.form_key] = [];
            } else if (q.question_type === 'textarea') { // Added: Handle textarea default
                defaults[q.form_key] = '';
            } else {
                     defaults[q.form_key] = '';
            }
        });
         }
        return defaults;
    }, [questionnaireData]) // Rerun only when questionnaireData changes
  });

  // --- Restore State Effect ---
  useEffect(() => {
    if (questionnaireData && !isInitialLoadDone.current && !hasRestoredState.current) {
        console.log("Attempting to restore state...");
        const savedStepStr = sessionStorage.getItem(SESSION_STORAGE_STEP_KEY);
        const savedAnswersStr = sessionStorage.getItem(SESSION_STORAGE_ANSWERS_KEY);

        let stepToRestore = 1;
        if (savedStepStr) {
            stepToRestore = parseInt(savedStepStr, 10);
            console.log("Restoring step:", stepToRestore);
            setCurrentStep(stepToRestore); // Set the restored step
        }

        if (savedAnswersStr) {
            try {
                const savedAnswers = JSON.parse(savedAnswersStr);
                console.log("Restoring answers:", savedAnswers);
                reset(savedAnswers); // Reset form first

                const durationKey = questionnaireData.find(q => q.form_key === 'duration')?.form_key;
                if (durationKey && Array.isArray(savedAnswers[durationKey]) && savedAnswers[durationKey].length > 0 && typeof savedAnswers[durationKey][0] === 'number') {
                   console.log("Setting duration visual state:", savedAnswers[durationKey][0]);
                   setDurationValue(savedAnswers[durationKey][0]); // Update visual state
                } else {
                   console.log("No valid duration found in saved answers, using default.");
                }

                // Restore budget value state
                if (savedAnswers.budget_range && typeof savedAnswers.budget_range === 'number') {
                    console.log("Setting budget value visual state:", savedAnswers.budget_range);
                    setBudgetValue(savedAnswers.budget_range);
                } else {
                    console.log("No valid budget value found in saved answers, using default.");
                }

                 hasRestoredState.current = true;
            } catch (e) {
                console.error("Failed to parse saved answers:", e);
                sessionStorage.removeItem(SESSION_STORAGE_ANSWERS_KEY); // Clear corrupted data
            }
        }
         isInitialLoadDone.current = true; // Mark initial load attempt as done
    }
  }, [questionnaireData, reset]); // Depend on data and reset function

  // --- Save State Effects ---
  useEffect(() => {
    // Save step whenever it changes, but only after initial load/restore attempt
    if (isInitialLoadDone.current) {
        console.log("Saving step:", currentStep);
        sessionStorage.setItem(SESSION_STORAGE_STEP_KEY, currentStep.toString());
    }
  }, [currentStep]);

  // Watch all form values - consider debouncing if performance is an issue
  const watchedValues = watch();
  useEffect(() => {
      // Save answers whenever they change, but only after initial load/restore attempt
      if (isInitialLoadDone.current) {
        const answersToSave = {
            ...watchedValues,
            budget_range: budgetValue // Include budget value in saved answers
        };
        console.log("Saving answers:", answersToSave);
        sessionStorage.setItem(SESSION_STORAGE_ANSWERS_KEY, JSON.stringify(answersToSave));
      }
  }, [watchedValues, budgetValue]); // Watch both form values and budget value

  // Find the current question based on array index, not step number
  const currentQuestion = useMemo(() => {
    // Ensure data is available before trying to find the question
    if (!questionnaireData || questionnaireData.length === 0) return null;
    // Use array index instead of step_number from database
    const question = questionnaireData[currentStep - 1]; // currentStep is 1-based, array is 0-based
    if (!question) {
        console.warn(`No question found for step ${currentStep} (array index ${currentStep - 1})`);
    }
    return question;
  }, [questionnaireData, currentStep]);

  // Set default viewed option for explainer when data loads
   useEffect(() => {
       if (!viewedOption && currentQuestion?.form_key === 'vibe' && currentQuestion.question_options.length > 0) {
           setViewedOption(currentQuestion.question_options[0]);
       }
   }, [currentQuestion, viewedOption]);

   // Watch duration for display
   const watchedDurationKey = useMemo(() => questionnaireData?.find(q => q.question_type === 'slider')?.form_key, [questionnaireData]);
   const watchedFormDuration = watchedDurationKey ? watch(watchedDurationKey) : undefined;

   useEffect(() => {
     if (watchedFormDuration && Array.isArray(watchedFormDuration) && watchedFormDuration.length > 0 && typeof watchedFormDuration[0] === 'number') {
        if(watchedFormDuration[0] !== durationValue) {
            setDurationValue(watchedFormDuration[0]);
        }
     }
   }, [watchedFormDuration, durationValue]);

  // Use hardcoded background image for all questionnaire steps
  const currentBackgroundImage = FALLBACK_BACKGROUND_IMAGE_URL;

  const processFormSubmit: SubmitHandler<Inputs> = (data) => {
    // Construct the final QuestionnaireAnswers structure
    // --- REVERTED: Ensure vibe and timing are handled as potentially multi-select arrays ---
    const answers: QuestionnaireAnswers = {
        interests: data['interests'] || [],
        regions: data['regions'] || [],
        avoids: data['avoids'] || [],
        // Treat vibe and timing as arrays from the form data
        vibe: data['vibe'] || [], // Expect array, default to empty array
        timing: data['timing'] || [], // Expect array, default to empty array
        // Pace is assumed single select (string)
        pace: data['pace'] || 'balanced', // Default if empty string
        budget_range: budgetValue, // Use the state value
        duration: data['duration']?.[0] ?? 14, // Updated fallback to 14
        openEndedQuery: data['openEndedQuery'] || '', // Added: Include openEndedQuery
    };
    console.log('Final Form Data (vibe/timing as arrays):', answers);
    // --- Clear storage on successful submit ---
    sessionStorage.removeItem(SESSION_STORAGE_STEP_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_ANSWERS_KEY);
    onSubmit(answers);
  };

  const nextStep = async () => {
    if (!currentQuestion) return;

    const fieldsToValidate = [currentQuestion.form_key];
    const isValidStep = await trigger(fieldsToValidate);

    if (isValidStep && currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else if (isValidStep && currentStep === TOTAL_STEPS) {
      handleSubmit(processFormSubmit)();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      // --- Clear storage when navigating back to landing ---
      sessionStorage.removeItem(SESSION_STORAGE_STEP_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_ANSWERS_KEY);
      // Navigate back to the main planner landing page
      navigate('/planner');
    }
  };

  // Function to find the image for the viewed option in the explainer dialog
  const getExplainerImage = (option: ViewedOptionType): string => {
    const fallbackImage = 'https://images.unsplash.com/photo-1534351450181-ea6f0011759a?w=800&q=80'; // Define fallback
    if (!option || !option.collection_map || !collectionsData) return fallbackImage;

    const matchedCollection = collectionsData.find(c => c.name === option.collection_map);
    return matchedCollection?.featured_image || fallbackImage;
  };

  // --- Helper to get validation rules ---
  const getValidationRules = (question: QuestionnaireQuestion | null) => {
    if (!question?.validation_rules) return {};

    const rules: Record<string, any> = {};
    const dbRules = question.validation_rules;

    if (dbRules.required) rules.required = 'This field is required'; // Basic required message

    // Rules for multi-select
    if (question.question_type.includes('multi_select')) {
        const min = dbRules.min_select ?? 1; // Default min 1 if not specified
        const max = dbRules.max_select;
        rules.validate = (value: string[] | undefined) => {
            const len = value?.length ?? 0;
            if (len < min) return `Please select at least ${min} option${min > 1 ? 's' : ''}`;
            if (max && len > max) return `Please select no more than ${max} option${max > 1 ? 's' : ''}`;
            return true;
        };
    }

    // Add other rule types here if needed (e.g., min/max for sliders are handled by the component props)

    return rules;
  }

  // --- Helper text determination (Example Logic) ---
  const getHelperText = (question: QuestionnaireQuestion | null): string => {
      if (!question) return "";
      if (question.question_type.includes('multi_select')) {
          const max = question.validation_rules?.max_select;
          const min = question.validation_rules?.min_select ?? 1; // Default min 1
          if (max && max > 1 && min === 1) return `Select up to ${max}`;
          if (max && max > 1 && min > 1) return `Select ${min} to ${max}`;
          if (max === 1 && min === 1) return "Select one"; // Or handle as single select type
          if (!max && min > 0) return `Select at least ${min}`;
          return "Choose all that apply"; // Fallback
      }
      if (question.question_type === 'slider') return question.helper_text || "";
      // Add more cases if needed
      return "";
  };
  const helperText = getHelperText(currentQuestion);

  // --- Loading and Error States ---
  // Combine loading states
  const isLoading = isLoadingQuestions || (isLoadingCollections && currentQuestion?.form_key === 'vibe');

  if (isLoading) {
    // Simplified Skeleton for single layout
    return (
      // Simplified Skeleton for single layout
      <div className="relative min-h-screen bg-gray-900 text-white p-6 md:p-10 lg:p-16 flex flex-col font-sans">
           <header className="relative z-10 flex justify-between items-center mb-10 md:mb-16">
               <Skeleton className="h-8 w-24 bg-gray-700" />
           </header>
           <div className="relative z-10 flex-grow flex flex-col">
               <Skeleton className="h-12 w-3/4 mx-auto mb-4 bg-gray-700" /> {/* Question Skeleton */}
               <Skeleton className="h-6 w-1/2 mx-auto mb-6 bg-gray-700" /> {/* Helper Text Skeleton */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"> {/* Options Skeleton */}
                   <Skeleton className="h-32 w-full bg-gray-700" />
                   <Skeleton className="h-32 w-full bg-gray-700" />
                   <Skeleton className="h-32 w-full bg-gray-700" />
                   <Skeleton className="h-32 w-full bg-gray-700" />
                   <Skeleton className="h-32 w-full bg-gray-700" />
                   <Skeleton className="h-32 w-full bg-gray-700" />
                   <Skeleton className="h-32 w-full bg-gray-700" />
                   <Skeleton className="h-32 w-full bg-gray-700" />
               </div>
               <div className="flex justify-center items-center pt-6 mt-auto gap-4"> {/* Nav Skeleton */}
                  <Skeleton className="h-10 w-24 bg-gray-700" />
                  <Skeleton className="h-12 w-32 bg-gray-600" />
               </div>
           </div>
       </div>
    );
  }

  if (questionsError) {
    return <div className="text-center text-red-400 py-10 bg-gray-900 min-h-screen">Error loading questionnaire: {(questionsError as Error).message}</div>;
  }

  // --- Check if data loaded but question not found (shouldn't happen with valid steps) ---
  if (!questionnaireData || TOTAL_STEPS === 0 || !currentQuestion) {
     // Added check for questionnaireData to prevent rendering this before load
     if (!isLoading && questionnaireData) {
        return <div className="text-center text-gray-400 py-10 bg-gray-900 min-h-screen">Questionnaire data loaded, but question for step {currentStep} not found.</div>;
     }
     // If still loading, the isLoading state above handles it.
     // If data is truly empty after load, show config error.
     if (!isLoading && !questionnaireData) {
        return <div className="text-center text-gray-400 py-10 bg-gray-900 min-h-screen">Questionnaire not configured or failed to load.</div>;
     }
     // Avoid rendering further if essential data is missing
     return null;
  }

  // --- RENDER LOGIC ---

  const renderOptions = (field: any, fieldState: any) => {
    if (!currentQuestion) return null;

    const options = currentQuestion.question_options;
    const optionCount = options.length;

    // --- Multi-Select Handler (Used for all relevant card types now) ---
    const handleMultiSelectChange = (optionValue: string) => {
        const currentSelection: string[] = field.value || [];
        let newSelection: string[];
        // Use validation rule max_select OR default to 99 if rule not present
        const maxSelections = currentQuestion.validation_rules?.max_select ?? 99;
        const isStrictlySingle = maxSelections === 1; // Check if DB enforces single select

        if (currentSelection.includes(optionValue)) {
            // Deselecting
            newSelection = currentSelection.filter(v => v !== optionValue);
        } else {
            // Selecting
            if (isStrictlySingle) {
                 // If DB rule says max 1, replace current selection
                 newSelection = [optionValue];
            } else if (currentSelection.length < maxSelections) {
                 // If multi-select allowed and limit not reached, add
                 newSelection = [...currentSelection, optionValue];
            } else {
                 // Multi-select limit reached, do nothing (or provide feedback)
                 newSelection = currentSelection;
            }
        }
        console.log(`Field ${field.name} (max: ${maxSelections}) updated to:`, newSelection);
        field.onChange(newSelection); // Always store as array
    };

    const gridClasses = cn(
        "grid gap-4",
        "grid-cols-2", // Mobile default
        optionCount <= 4 ? "md:grid-cols-2" : "md:grid-cols-4", // Desktop
        currentQuestion.question_type === 'card_multi_select_regions' ? "flip-card-grid-container" : "" // Only add perspective for regions
    );

    // --- Slider Specific Constants ---
    const isSliderQuestion = currentQuestion.question_type === 'slider';
    const sliderMin = currentQuestion?.validation_rules?.min ?? 3;
    const sliderMax = currentQuestion?.validation_rules?.max ?? 21;

    // Calculate percentage for slider value tooltip positioning
    const getSliderPercent = (value: number) => {
        const percent = ((value - sliderMin) / (sliderMax - sliderMin)) * 100;
        // Clamp between 0 and 100 in case of rounding errors
        return Math.max(0, Math.min(100, percent));
    };
    const currentValuePercent = getSliderPercent(durationValue); // Use the visual state

    return (
       <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto">
         <div className="space-y-4">
            {/* Type: Multi-Select Cards (Vibe, Interests) */}
            {(currentQuestion.question_type === 'card_multi_select' || currentQuestion.question_type === 'card_multi_select_interests') && (
                <div className={gridClasses} >
                    {options.map((option) => {
                        const iconName = option.icon_name;
                        // Max selections from validation rules, default high
                        const maxSelections = currentQuestion.validation_rules?.max_select ?? 99;
                        const isStrictlySingle = maxSelections === 1;

                        // Always check array inclusion now
                        const isSelected = field.value?.includes(option.value);

                        // Disable logic: only if multi-select limit is reached
                        const isDisabled = !isStrictlySingle && !isSelected && (field.value?.length ?? 0) >= maxSelections;

                        return (
                            <Card
                                key={option.id}
                                // Always use handleMultiSelectChange, but respect isDisabled
                                onClick={() => { if (!isDisabled) { handleMultiSelectChange(option.value); } }}
                                className={cn(
                                     `transition-all text-center flex flex-col justify-center group border backdrop-blur-sm`,
                                     `min-h-[100px]`,
                                     optionCount > 4 ? 'md:min-h-[160px]' : 'md:min-h-[140px]',
                                     isSelected
                                        ? 'bg-white/20 border-white ring-2 ring-white/80 scale-[1.02]'
                                        : 'bg-black/30 border-gray-400/50 hover:border-gray-300 hover:bg-black/50',
                                     isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                )}
                            >
                                <CardContent className="flex flex-col items-center justify-center p-4 flex-grow text-white group-hover:text-white">
                                     {iconName ? (
                                        <DynamicIcon name={iconName} className={cn("h-7 w-7 md:h-8 md:h-8 mb-2 transition-colors", isSelected ? "text-white" : "text-gray-300 group-hover:text-white")} />
                                     ) : null }
                                    <span className={cn( "font-medium font-sans text-center text-lg md:text-xl transition-colors", !iconName && "mt-1" )}>
                                        {option.display_text}
                                    </span>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Type: Multi-Select Region Cards - USE FLIP CARD */}
            {currentQuestion.question_type === 'card_multi_select_regions' && (
                 <div className={gridClasses}>
                    {options.map((option) => {
                        const isSelected = field.value?.includes(option.value);
                        const maxSelections = currentQuestion.validation_rules?.max_select ?? 99;
                        const isDisabled = !isSelected && (field.value?.length ?? 0) >= maxSelections;
                        return (
                            <FlipCard
                                key={option.id}
                                isSelected={isSelected}
                                isDisabled={isDisabled}
                                onClick={() => { if (!isDisabled) { handleMultiSelectChange(option.value); } }}
                                frontContent={( <span className="font-medium font-sans text-center text-lg md:text-xl">{option.display_text}</span> )}
                                backContent={(
                                    // --- MODIFIED BACK CONTENT ---
                                    // Use a relative container for positioning the overlay
                                    <div className="relative w-full h-full">
                                        {/* Image */}
                                    {option.image_url ? (
                                            <img
                                                src={option.image_url}
                                                alt={option.display_text}
                                                className="w-full h-full object-cover" // Ensure image covers the back
                                                loading="lazy" // Lazy load images
                                            />
                                        ) : (
                                             // Fallback if no image URL
                                            <div className="w-full h-full flex items-center justify-center bg-gray-600 text-gray-400 text-xs p-2">
                                                No Image Available
                                            </div>
                                        )}
                                        {/* Overlay for Text */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2 pointer-events-none">
                                            <span className="font-semibold font-sans text-white text-lg text-center drop-shadow-md">
                                                {option.display_text}
                                            </span>
                                </div>
                                    </div>
                                    // --- END MODIFIED BACK CONTENT ---
                                )}
                            />
                        );
                    })}
                </div>
            )}

            {/* Type: Slider */}
            {isSliderQuestion && (
                 <div className="space-y-8 pt-8 pb-4 max-w-2xl mx-auto"> {/* Increased space between sliders */}
                    {/* Duration Slider */}
                    <div className="space-y-2">
                        <div className="text-center mb-4">
                            <h3 className="text-2xl font-serif text-white">Duration</h3>
                        </div>
                        {/* Duration Value Tooltip */}
                        <div className="relative h-8 mb-1"> {/* Container for tooltip */}
                            <div
                                 className="absolute px-3 py-1 bg-gray-700/80 backdrop-blur-sm text-white text-lg font-semibold font-sans rounded-md shadow-lg transform -translate-x-1/2"
                                 style={{ left: `${currentValuePercent}%` }}
                            >
                                {durationValue} days
                            </div>
                        </div>
                        {/* Duration Slider Track and Labels */}
                        <div className="relative w-full">
                           <Slider
                               min={sliderMin}
                               max={sliderMax}
                               step={currentQuestion.validation_rules?.step ?? 1}
                               value={Array.isArray(field.value) && typeof field.value[0] === 'number' ? field.value : [durationValue]}
                               onValueChange={(value) => {
                                   field.onChange(value);
                               }}
                               className="w-full [&>span:first-child]:h-1.5 [&>span:first-child>span]:bg-white [&>span:first-child]:bg-white/30"
                           />
                           {/* Min/Max Labels */}
                           <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                               <span>{sliderMin} days</span>
                               <span>{sliderMax} days</span>
                           </div>
                        </div>
                       {/* Duration Helper text below the slider component */}
                       {currentQuestion.helper_text && (
                         <p className="text-lg font-sans text-gray-300 text-center pt-2">{currentQuestion.helper_text}</p>
                       )}
                    </div>

                    {/* Budget Slider */}
                    <div className="space-y-2">
                        <div className="text-center mb-4">
                            <h3 className="text-2xl font-serif text-white">Budget Range per Person</h3>
                        </div>
                        {/* Budget Value Tooltip */}
                        <div className="relative h-8 mb-1">
                            {(() => {
                                const budgetPercent = ((budgetValue - 5000) / (35000 - 5000)) * 100;
                                
                                return (
                                    <div className="absolute px-3 py-1 bg-gray-700/80 backdrop-blur-sm text-white text-lg font-semibold font-sans rounded-md shadow-lg transform -translate-x-1/2"
                                         style={{ left: `${budgetPercent}%` }}>
                                        £{budgetValue.toLocaleString()}
                                    </div>
                                );
                            })()}
                        </div>
                        {/* Budget Slider Track */}
                        <div className="relative w-full">
                            <Slider
                                min={5000}
                                max={35000}
                                step={1000}
                                value={[budgetValue]}
                                onValueChange={(value) => {
                                    if (value.length >= 1) {
                                        setBudgetValue(value[0]);
                                    }
                                }}
                                className="w-full [&>span:first-child]:h-1.5 [&>span:first-child>span]:bg-white [&>span:first-child]:bg-white/30"
                            />
                            {/* Min/Max Labels */}
                            <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                                <span>£5,000</span>
                                <span>£35,000</span>
                            </div>
                        </div>
                        <p className="text-lg font-sans text-gray-300 text-center pt-2">Select your maximum budget per person.</p>
                    </div>
                 </div>
            )}

            {/* Added: Type: Textarea for Open-ended Question */}
            {currentQuestion.question_type === 'textarea' && (
                <div className="w-full max-w-3xl mx-auto mt-8"> {/* MODIFIED: Was max-w-xl, changed to max-w-2xl for more width */}
                    <Textarea
                        {...field} // Spread field props for RHF connection
                        rows={4} // MODIFIED: Increased suggested rows slightly to match potential height increase
                        className={cn(
                            "w-full bg-black/40 backdrop-blur-md border border-gray-400/60 rounded-lg p-3 text-xl font-sans text-white",
                            "placeholder:text-gray-300/70 placeholder:italic",
                            "focus:ring-1 focus:ring-white/80 focus:border-white/90 shadow-lg",
                            "min-h-[100px]" // MODIFIED: Was min-h-[80px], increased for slightly more height
                        )}
                        placeholder="e.g., 'We are thinking about Italy or Japan as our preferred destinations', 'We would love to do 1 week of resort relaxation and 1 week of adventure'"
                        id={currentQuestion.form_key}
                    />
                </div>
            )}
            {/* End Added: Type: Textarea */}
        </div>

        {/* Display validation error message */}
        {fieldState.error && <p className="text-xl text-red-300 text-center mt-4">{fieldState.error.message}</p>}
       </div>
    );
  };


  // --- Main Component Return ---

  return (
    <>
      {/* Main container: Use dynamic background image */}
      <div
        className="relative min-h-screen text-white p-6 md:p-10 lg:p-16 flex flex-col font-sans bg-cover bg-center bg-no-repeat transition-all duration-500 ease-in-out"
        style={{ backgroundImage: `url(${currentBackgroundImage})` }}
        key={currentBackgroundImage}
      >
        {/* Fade Overlay */}
        <div className="absolute inset-0 bg-black/60 z-0"></div>

        {/* Header Section - Stays at the top in flow */}
         <header className="relative z-10 w-full flex justify-between items-center mb-6 md:mb-10 px-0">
             <Link to="/" className="text-3xl font-serif font-semibold tracking-wider text-white">
                MOONS
             </Link>
             <span className="text-lg font-serif font-light text-gray-300">
                 Question {currentStep} / {TOTAL_STEPS}
             </span>
        </header>

        {/* ---- Centering Wrapper for Form Content ---- */}
        <div className="relative z-10 flex-grow flex flex-col items-center justify-center">
             {/* Form Wrapper - Controls max content width */}
            <div className="w-full max-w-4xl xl:max-w-5xl flex flex-col items-center">
        <form
            onSubmit={handleSubmit(processFormSubmit)}
                     className="w-full flex flex-col items-center flex-grow"
                    key={currentStep}
        >
                    {/* Motion Div: Acts as the main flex container for question->options->buttons */}
                    {/* Needs flex-grow to ensure it expands vertically to push buttons down with mt-auto */}
            <motion.div
                         className="w-full flex flex-col items-center flex-grow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                         {/* Question */}
                        <Label className="text-4xl md:text-5xl font-serif leading-tight block text-white mb-10 text-center max-w-4xl">
                    {currentQuestion.question_text}
                </Label>
                        {/* --- MODIFIED: Conditionally render Helper Text --- */}
                        {/* Only render generic helper if NOT a slider question */}
                        {helperText && !currentQuestion?.question_type.includes('slider') && (
                            <p className="text-xl text-gray-300 mb-6 md:mb-8 text-center max-w-2xl mx-auto">{helperText}</p>
                        )}
                        {/* --- END MODIFIED HELPER TEXT --- */}

                        {/* Options Grid Area */}
                        <div className="w-full mb-10 md:mb-16">
                    <Controller
                        name={currentQuestion.form_key}
                        control={control}
                        rules={getValidationRules(currentQuestion)}
                        render={({ field, fieldState }) => renderOptions(field, fieldState)}
                    />
                </div>

                         {/* Navigation Buttons Below Grid */}
                         {/* mt-auto pushes this div to the bottom of the flex container (motion.div) */}
                         {/* justify-center handles horizontal centering */}
                        <div className="flex justify-center items-center mt-auto pt-4 md:pt-6 gap-4 w-full">
                            {/* Previous Button: Always rendered now */}
                            <Button
                               type="button"
                               variant="ghost"
                               onClick={prevStep}
                               className={cn("text-gray-300 hover:text-white hover:bg-white/10 px-6 py-2 text-xl")}
                            >
                               Previous
                            </Button>
                            {/* Next/Submit Button */}
                            <Button type="button" onClick={nextStep} size="lg" className="bg-white/90 hover:bg-white text-black font-semibold px-10 py-3 text-xl">{TOTAL_STEPS === currentStep ? 'Find My Honeymoon' : 'Next'}</Button>
                </div>
            </motion.div>
        </form>
            </div>
        </div>
         {/* ---- END: Centering Wrapper ---- */}
      </div>
    </>
  );
};

export default QuestionnaireForm;