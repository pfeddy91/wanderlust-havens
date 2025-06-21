import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Map, User, ClipboardList, Compass, MessageSquarePlus } from 'lucide-react';
import { ContactSEO } from '@/components/SEO';

interface Tour {
  title: string;
}

interface ContactUsProps {
  tours?: Tour[];
}

// Define Zod schema for validation
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());
const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const phoneCountryCodeOptions = [
  { value: "+44", label: "United Kingdom (+44)" },
  { value: "+1", label: "United States (+1)" },
  { value: "+61", label: "Australia (+61)" },
  { value: "+33", label: "France (+33)" },
  { value: "+49", label: "Germany (+49)" },
  { value: "+39", label: "Italy (+39)" },
  { value: "+34", label: "Spain (+34)" },
  { value: "+81", label: "Japan (+81)" },
  { value: "+65", label: "Singapore (+65)" },
  { value: "+971", label: "United Arab Emirates (+971)" },
];

const preferredContactMethodOptions = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "text", label: "Text Message" },
];

// Region options - replace with actual data fetching for regions
const regionOptions = [
  { value: "europe", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "africa", label: "Africa" },
  { value: "south_america", label: "South America" },
  { value: "north_america", label: "North America" },
  { value: "oceania", label: "Oceania (Australia & Pacific)" },
  { value: "open_to_suggestions", label: "Open to suggestions" },
];

const seasonOptions = [
  { value: "spring_early_summer", label: "Spring / Early Summer (Mar-Jun)" },
  { value: "summer_late_summer", label: "Summer / Late Summer (Jul-Sep)" },
  { value: "autumn_early_winter", label: "Autumn / Early Winter (Oct-Dec)" },
  { value: "winter_late_winter", label: "Winter / Late Winter (Jan-Feb)" },
];

const formSchema = z.object({
  // Section 1: Your Trip
  destinations: z.string().min(1, { message: "Please select your preferred destination or 'Open to suggestions'." }),
  travelSeason: z.string().min(1, { message: "Please select a season."}),
  duration: z.string().min(1, { message: "Please enter the trip duration." }),
  budgetRange: z.array(z.number()).min(2).max(2).default([5000, 10000]),
  tourOfInterest: z.string().optional(),
  comments: z.string().optional(),
  
  // Section 2: Your Details
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  confirmEmail: z.string().email({ message: "Please confirm your email address." }),
  phoneCountryCode: z.string().min(1, { message: "Please select a country code." }),
  phoneNumber: z.string().min(5, { message: "Please enter a valid phone number." }),
  preferredContactMethods: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one contact method.",
  }),
}).refine(data => data.email === data.confirmEmail, {
  message: "Email addresses do not match.",
  path: ["confirmEmail"],
});

type FormData = z.infer<typeof formSchema>;

const budgetMarks = [
  { value: 3000, label: "£3k" },
  { value: 5000, label: "£5k" },
  { value: 7000, label: "£7k" },
  { value: 10000, label: "£10k" },
  { value: 15000, label: "£15k" },
  { value: 20000, label: "£20k+" },
];
const minBudget = budgetMarks[0].value;
const maxBudget = budgetMarks[budgetMarks.length - 1].value;

const ContactUs: React.FC<ContactUsProps> = ({ tours = [] }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    getValues
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destinations: "",
      travelSeason: "",
      duration: "",
      budgetRange: [5000, 10000],
      tourOfInterest: "None in particular",
      comments: "",
      firstName: "",
      lastName: "",
      email: "",
      confirmEmail: "",
      phoneCountryCode: "+44",
      phoneNumber: "",
      preferredContactMethods: ["email"],
    }
  });

  const budgetValue = watch("budgetRange");
  const contactMethods = watch("preferredContactMethods");

  const handleContactMethodChange = (method: string) => {
    const currentMethods = getValues("preferredContactMethods");
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter(item => item !== method)
      : [...currentMethods, method];
    setValue("preferredContactMethods", newMethods, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Get Supabase URL from environment or use default
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ydcggawwxohbcpcjyhdk.supabase.co';
      
      // Call the Supabase Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/contact-inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Thank you for your inquiry! We've received your request and will be in touch within 24 hours.");
        // Optionally reset the form or redirect to a thank you page
        window.location.href = '/';
      } else {
        throw new Error(result.error || 'Failed to submit inquiry');
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert("We're sorry, there was an error submitting your inquiry. Please try again or contact us directly at infogomoons@gmail.com.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <ContactSEO />
      {/* Fixed container with padding top to account for header */}
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
              Plan Your Dream Honeymoon
            </h1>
            <p className="text-2xl font-serif text-gray-600 max-w-2xl mx-auto">
              Tell us about your perfect honeymoon. We'll create a bespoke itinerary just for you.
            </p>
          </div>

          {/* Form Container */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Section 1: Your Trip */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-700 font-serif mb-6 border-b border-gray-200 pb-4">
                Your Trip Details
              </h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="destinations" className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Where would you like to go?*
                  </Label>
                  <Controller
                    name="destinations"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a destination or 'Open to suggestions'" />
                        </SelectTrigger>
                        <SelectContent>
                          {regionOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.destinations && <p className="text-red-600 text-sm mt-1">{errors.destinations.message}</p>}
                </div>

                <div>
                  <Label htmlFor="tourOfInterest" className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Is there a specific tour that caught your attention?
                  </Label>
                  <Controller
                    name="tourOfInterest"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a tour" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          <SelectItem value="None in particular">None in particular</SelectItem>
                          {tours.map(tour => (
                            <SelectItem key={tour.title} value={tour.title}>{tour.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tourOfInterest && <p className="text-red-600 text-sm mt-1">{errors.tourOfInterest.message}</p>}
                </div>

                <div>
                  <Label className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    When would you like to go?*
                  </Label>
                  <Controller
                    name="travelSeason"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a season" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasonOptions.map(season => (
                            <SelectItem key={season.value} value={season.value}>{season.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.travelSeason && <p className="text-red-600 text-sm mt-1">{errors.travelSeason.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="duration" className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    How long would you like your honeymoon to be?*
                  </Label>
                  <Input 
                    id="duration" 
                    {...register("duration")} 
                    placeholder="e.g., 10 days, 2 weeks"
                    className="mt-2"
                  />
                  {errors.duration && <p className="text-red-600 text-sm mt-1">{errors.duration.message}</p>}
                </div>

                <div>
                  <Label className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Budget per person (£)
                  </Label>
                  <p className="text-base font-light mb-4">
                    £{budgetValue[0].toLocaleString()} - £{budgetValue[1].toLocaleString()}{budgetValue[1] === maxBudget ? '+' : ''}
                  </p>
                  <Controller
                    name="budgetRange"
                    control={control}
                    render={({ field }) => {
                      const trackRef = useRef<HTMLDivElement>(null);

                      const getClampedValue = useCallback((clientX: number) => {
                        if (!trackRef.current) return 0;
                        const rect = trackRef.current.getBoundingClientRect();
                        const percent = (clientX - rect.left) / rect.width;
                        const clampedPercent = Math.max(0, Math.min(1, percent));
                        return minBudget + clampedPercent * (maxBudget - minBudget);
                      }, []);

                      const handleInteractionStart = useCallback((
                        e: React.MouseEvent | React.TouchEvent,
                        thumb: 'min' | 'max'
                      ) => {
                        e.preventDefault();

                        const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
                          const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
                          const rawValue = getClampedValue(clientX);
                          const value = Math.round(rawValue / 100) * 100;
                          
                          const [minVal, maxVal] = field.value;

                          if (thumb === 'min') {
                            const newMin = Math.min(value, maxVal - 100);
                            field.onChange([newMin, maxVal]);
                          } else {
                            const newMax = Math.max(value, minVal + 100);
                            field.onChange([minVal, newMax]);
                          }
                        };

                        const endHandler = () => {
                          window.removeEventListener('mousemove', moveHandler);
                          window.removeEventListener('mouseup', endHandler);
                          window.removeEventListener('touchmove', moveHandler);
                          window.removeEventListener('touchend', endHandler);
                        };

                        window.addEventListener('mousemove', moveHandler);
                        window.addEventListener('mouseup', endHandler);
                        window.addEventListener('touchmove', moveHandler);
                        window.addEventListener('touchend', endHandler);
                      }, [field, getClampedValue]);

                      const minPos = ((field.value[0] - minBudget) / (maxBudget - minBudget)) * 100;
                      const maxPos = ((field.value[1] - minBudget) / (maxBudget - minBudget)) * 100;

                      return (
                        <div className="relative flex items-center h-10">
                          <div
                            ref={trackRef}
                            className="relative w-full h-1.5 rounded-full bg-gray-200"
                          >
                            <div
                              className="absolute h-full rounded-full bg-[#00395c]"
                              style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
                            />
                            <div
                              className="absolute w-5 h-5 rounded-full bg-white border-2 border-[#00395c] cursor-pointer shadow-sm"
                              style={{
                                left: `${minPos}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 1,
                              }}
                              onMouseDown={(e) => handleInteractionStart(e, 'min')}
                              onTouchStart={(e) => handleInteractionStart(e, 'min')}
                            />
                            <div
                              className="absolute w-5 h-5 rounded-full bg-white border-2 border-[#00395c] cursor-pointer shadow-sm"
                              style={{
                                left: `${maxPos}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 1,
                              }}
                              onMouseDown={(e) => handleInteractionStart(e, 'max')}
                              onTouchStart={(e) => handleInteractionStart(e, 'max')}
                            />
                          </div>
                        </div>
                      );
                    }}
                  />
                  {errors.budgetRange && <p className="text-red-600 text-sm mt-1">{errors.budgetRange.message}</p>}
                </div>

                <div>
                  <Label htmlFor="comments" className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Tell us about your dream honeymoon
                  </Label>
                  <Textarea
                    id="comments"
                    {...register("comments")}
                    placeholder="Share your vision - whether you're looking for adventure, relaxation, cultural experiences, luxury resorts, or a mix of everything..."
                    rows={4}
                    className="mt-2"
                  />
                  {errors.comments && <p className="text-red-600 text-lg mt-1">{errors.comments.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Your Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-700 font-serif mb-6 border-b border-gray-200 pb-4">
                Your Contact Details
              </h2>
              <div className="space-y-6">
                <div>
                  <Label className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Your names*
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input 
                        id="firstName" 
                        {...register("firstName")} 
                        placeholder="First name"
                      />
                      {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <Input 
                        id="lastName" 
                        {...register("lastName")} 
                        placeholder="Last name"
                      />
                      {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email" className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Email address*
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    {...register("email")} 
                    placeholder="your@email.com"
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="confirmEmail" className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Confirm email address*
                  </Label>
                  <Input 
                    id="confirmEmail" 
                    type="email" 
                    {...register("confirmEmail")} 
                    placeholder="Confirm your email"
                  />
                  {errors.confirmEmail && <p className="text-red-600 text-sm mt-1">{errors.confirmEmail.message}</p>}
                </div>
                
                <div>
                  <Label className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    Phone number*
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <Controller
                        name="phoneCountryCode"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Country Code" />
                            </SelectTrigger>
                            <SelectContent>
                              {phoneCountryCodeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.phoneCountryCode && <p className="text-red-600 text-sm mt-1">{errors.phoneCountryCode.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <Input 
                        id="phoneNumber" 
                        type="tel" 
                        {...register("phoneNumber")} 
                        placeholder="Phone number"
                      />
                      {errors.phoneNumber && <p className="text-red-600 text-sm mt-1">{errors.phoneNumber.message}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="!text-xl md:!text-2xl font-serif font-semibold text-gray-700 mb-3 block">
                    How should we contact you?*
                  </Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {preferredContactMethodOptions.map((option) => (
                      <div key={option.value} className="flex items-center">
                        <Checkbox
                          id={option.value}
                          checked={contactMethods.includes(option.value)}
                          onCheckedChange={() => handleContactMethodChange(option.value)}
                        />
                        <Label htmlFor={option.value} className="ml-2 text-base text-gray-700">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.preferredContactMethods && <p className="text-red-600 text-sm mt-1">{errors.preferredContactMethods.message}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center pt-6">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="text-white font-serif rounded-[10px] px-10 h-12 capitalize text-sm md:text-lg font-normal tracking-wide transition-colors duration-200"
                style={{ backgroundColor: '#00395c' }}
              >
                {isSubmitting ? 'Sending...' : 'Send Enquiry'}
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 text-center mt-4">
              By proceeding, I understand that the personal data I provide will be used to deal with my request in accordance with our privacy policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;