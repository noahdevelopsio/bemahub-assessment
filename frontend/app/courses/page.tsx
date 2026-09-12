"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Course, CourseListResponse } from "@/lib/types/api";
import { formatMoney, formatNullableNumber } from "@/lib/format";
import { StatusMessage } from "@/components/StatusMessage";

export default function CoursesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await api.get<CourseListResponse>("/courses");
      return response.data;
    },
    staleTime: (query) => {
      const seconds = query.state.data?.previewExpiresInSeconds;
      return typeof seconds === "number" ? seconds * 1000 : 0;
    },
  });

  if (isLoading) {
    return <StatusMessage state="loading" />;
  }

  if (error) {
    return <StatusMessage state="error" message={error.message} />;
  }

  if (!data || data.courses.length === 0) {
    return <StatusMessage state="empty" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Courses</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.courses.map((course: Course) => (
          <div
            key={course.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{course.title}</h2>
            <p className="mb-2 text-sm text-slate-500">by {course.instructorName}</p>
            
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="font-medium">
                {formatMoney(course.priceMinor, course.currency)}
              </span>
            </div>
            
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Enrolled: {formatNullableNumber(course.enrolmentCount)}</span>
              <span>Rating: {formatNullableNumber(course.averageRating)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
