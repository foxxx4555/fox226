import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const LoadItemSkeleton = () => (
    <div className="p-6 rounded-3xl bg-white border border-slate-100 animate-pulse">
        <div className="flex justify-between mb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-20 h-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex items-center gap-2 mb-1">
            <Skeleton className="w-1 h-4 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-dashed border-slate-100">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-24" />
        </div>
    </div>
);

export const TrackingTimelineSkeleton = () => (
    <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <div className="bg-slate-900 p-6 flex justify-between items-center">
            <Skeleton className="h-6 w-32 bg-slate-800" />
            <Skeleton className="h-4 w-40 bg-slate-800" />
        </div>
        <CardContent className="p-10">
            <div className="relative flex justify-between items-center px-4">
                <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-slate-100 -translate-y-1/2"></div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center gap-4">
                        <Skeleton className="w-14 h-14 rounded-[1.25rem]" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

export const MapSkeleton = () => (
    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden flex-1 min-h-[450px] flex flex-col relative border border-slate-100">
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
            <div className="bg-white/90 p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-2">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="w-12 h-12 rounded-2xl" />
            </div>
        </div>
        <CardContent className="p-0 flex-1 relative bg-slate-50 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Skeleton className="w-32 h-32 rounded-full mx-auto" />
                    <Skeleton className="h-6 w-48 mx-auto" />
                    <Skeleton className="h-4 w-64 mx-auto" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export const TrackingPageSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden flex flex-col h-[750px]">
            <CardHeader className="bg-slate-900 p-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-32 bg-slate-800" />
                    <Skeleton className="h-8 w-12 bg-slate-800 rounded-2xl" />
                </div>
            </CardHeader>
            <div className="p-4 space-y-3 overflow-hidden">
                {[1, 2, 3, 4].map((i) => <LoadItemSkeleton key={i} />)}
            </div>
        </Card>
        <div className="lg:col-span-2 space-y-6 flex flex-col">
            <TrackingTimelineSkeleton />
            <MapSkeleton />
        </div>
    </div>
);
