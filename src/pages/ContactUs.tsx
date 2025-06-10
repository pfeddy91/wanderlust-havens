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

interface Tour {
  title: string;
}

interface ContactUsProps {
  tours: Tour[];
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
  // Add more country codes as needed
];

const preferredContactMethodOptions = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "text", label: "Text Message" },
];

// Mocked data - replace with actual data fetching for regions
const regionOptions = [
  { value: "europe", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "africa", label: "Africa" },
  { value: "south_america", label: "South America" },
  { value: "north_america", label: "North America" },
  { value: "oceania", label: "Oceania (Australia & Pacific)" },
  { value: "open_to_suggestions", label: "Open to suggestions" },
  // Consider fetching these from your database: public.regions.name
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
  
  // Section 2: Your Details - Updated as per the new screenshot
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  confirmEmail: z.string().email({ message: "Please confirm your email address." }),
  phoneCountryCode: z.string().min(1, { message: "Please select a country code." }),
  phoneNumber: z.string().min(5, { message: "Please enter a valid phone number." }), // Basic validation
  preferredContactMethods: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one contact method.",
  }),
}).refine(data => data.email === data.confirmEmail, {
  message: "Email addresses do not match.",
  path: ["confirmEmail"], // Point error to the confirmEmail field
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

const peopleOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

const ContactUs: React.FC<ContactUsProps> = ({ tours }) => {
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
      phoneCountryCode: "+44", // Default to UK
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
    console.log("Form data submitted:", data);
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert("Thank you for your inquiry! We will be in touch shortly.");
  };

  return (
    <main className="bg-white text-black py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-gray-50 p-6 md:p-10 rounded-lg shadow-sm border border-gray-200">
          
          {/* Section 1: Your Trip */}
          <section className="bg-white p-6 md:p-8 rounded-md shadow">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-semibold text-gray-700 tracking-wide font-serif">YOUR TRIP</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="destinations" className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">Where would you like to go?*</Label>
                <Controller
                  name="destinations"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full bg-white border-gray-300 text-sm focus:ring-travel-coral focus:border-travel-coral">
                        <SelectValue placeholder="Select a destination or 'Open to suggestions'" />
                      </SelectTrigger>
                      <SelectContent>
                        {regionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value} className="text-sm">{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.destinations && <p className="text-xs text-red-600 mt-1">{errors.destinations.message}</p>}
              </div>

              <div>
                <Label htmlFor="tourOfInterest" className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">Is there a Moon that caught your attention?</Label>
                <Controller
                  name="tourOfInterest"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full bg-white border-gray-300 text-sm focus:ring-travel-coral focus:border-travel-coral">
                        <SelectValue placeholder="Select a tour" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56" side="bottom">
                        <SelectItem value="None in particular">None in particular</SelectItem>
                        {tours.map(tour => (
                          <SelectItem key={tour.title} value={tour.title} className="text-sm">{tour.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tourOfInterest && <p className="text-xs text-red-600 mt-1">{errors.tourOfInterest.message}</p>}
              </div>

              <div>
                <Label className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">When would you like to go?*</Label>
                <Controller
                  name="travelSeason"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full bg-white border-gray-300 text-sm focus:ring-travel-coral focus:border-travel-coral">
                        <SelectValue placeholder="Select a season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasonOptions.map(season => (
                          <SelectItem key={season.value} value={season.value} className="text-sm">{season.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.travelSeason && <p className="text-xs text-red-600 mt-1">{errors.travelSeason.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="duration" className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">How long for?*</Label>
                <Input 
                  id="duration" 
                  {...register("duration")} 
                  placeholder="Duration of trip (e.g., 7 nights)"
                  className="bg-white border-gray-300 focus:ring-travel-coral focus:border-travel-coral text-sm"
                />
                {errors.duration && <p className="text-xs text-red-600 mt-1">{errors.duration.message}</p>}
              </div>

              <div>
                <Label className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">How much would you like to spend per person?</Label>
                <p className="text-lg text-gray-900 font-medium mb-4">£{budgetValue[0].toLocaleString()} - £{budgetValue[1].toLocaleString()}{budgetValue[1] === maxBudget ? '+' : ''}</p>
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
                    }, [minBudget, maxBudget]);

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
                            className="absolute h-full rounded-full bg-[#A72424]"
                            style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
                          />
                          <div
                            className="absolute w-5 h-5 rounded-full bg-white border-2 border-[#A72424] cursor-pointer"
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
                            className="absolute w-5 h-5 rounded-full bg-white border-2 border-[#A72424] cursor-pointer"
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
                {errors.budgetRange && <p className="text-xs text-red-600 mt-1">{errors.budgetRange.message}</p>}
              </div>

              <div>
                <Label htmlFor="comments" className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">Tell us more about what you are looking for</Label>
                <Textarea
                  id="comments"
                  {...register("comments")}
                  placeholder="E.g. 'We are thinking about Italy or Japan as our preferred destinations', 'We would love to do 1 week of resort relaxation and 1 week of adventure'"
                  rows={4}
                  className="bg-white border-gray-300 focus:ring-pink-500 focus:border-pink-500 text-base placeholder-gray-400"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Your Details */}
          <section className="bg-white p-6 md:p-8 rounded-md shadow">
            <h2 className="text-xl font-semibold text-gray-700 tracking-wide mb-6 border-b pb-3 font-serif">YOUR DETAILS</h2>
            <div className="space-y-5">
              <div>
                <Label className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">Your name*</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input 
                      id="firstName" 
                      {...register("firstName")} 
                      placeholder="First name*" 
                      className="bg-white border-gray-300 focus:ring-pink-500 focus:border-pink-500 text-base placeholder-gray-400" 
                    />
                    {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <Input 
                      id="lastName" 
                      {...register("lastName")} 
                      placeholder="Last name*"
                      className="bg-white border-gray-300 focus:ring-pink-500 focus:border-pink-500 text-base placeholder-gray-400"
                    />
                    {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">Email address*</Label>
                <Input 
                  id="email" 
                  type="email" 
                  {...register("email")} 
                  placeholder="example@email.com"
                  className="bg-white border-gray-300 focus:ring-pink-500 focus:border-pink-500 text-base placeholder-gray-400"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="confirmEmail" className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">Confirm email address*</Label>
                <Input 
                  id="confirmEmail" 
                  type="email" 
                  {...register("confirmEmail")} 
                  placeholder="example@email.com"
                  className="bg-white border-gray-300 focus:ring-pink-500 focus:border-pink-500 text-base placeholder-gray-400"
                />
                {errors.confirmEmail && <p className="text-xs text-red-600 mt-1">{errors.confirmEmail.message}</p>}
              </div>
              
              <div>
                <Label className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">Telephone*</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <Controller
                      name="phoneCountryCode"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="w-full bg-white border-gray-300 text-base placeholder-gray-400">
                            <SelectValue placeholder="Country Code*" />
                          </SelectTrigger>
                          <SelectContent>
                            {phoneCountryCodeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value} className="text-sm">{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.phoneCountryCode && <p className="text-xs text-red-600 mt-1">{errors.phoneCountryCode.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Input 
                      id="phoneNumber" 
                      type="tel" 
                      {...register("phoneNumber")} 
                      placeholder="Phone number"
                      className="bg-white border-gray-300 focus:ring-pink-500 focus:border-pink-500 text-base placeholder-gray-400"
                    />
                    {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber.message}</p>}
                  </div>
                </div>
              </div>

              <div>
                <Label className="block font-medium text-gray-700 mb-1 text-lg md:text-xl font-serif">How should we follow up?*</Label>
                <div className="flex items-center space-x-4 pt-2">
                  {preferredContactMethodOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                       <Checkbox
                        id={option.value}
                        checked={contactMethods.includes(option.value)}
                        onCheckedChange={() => handleContactMethodChange(option.value)}
                      />
                      <Label htmlFor={option.value} className="ml-2 text-base font-normal text-gray-700">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.preferredContactMethods && <p className="text-xs text-red-600 mt-1">{errors.preferredContactMethods.message}</p>}
              </div>
            </div>
          </section>

          <div className="pt-8 text-center">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-travel-burgundy hover:bg-travel-burgundy/90 text-white font-serif rounded-[10px] px-10 h-12 capitalize text-lg font-medium tracking-wide w-full md:w-auto transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            By proceeding, I understand that the personal data I provide will be used to deal with my request in accordance with the <a href="/privacy-policy" className="underline hover:text-pink-600">privacy policy</a>.
          </p>
        </form>
      </div>
    </main>
  );
};

export default ContactUs; 