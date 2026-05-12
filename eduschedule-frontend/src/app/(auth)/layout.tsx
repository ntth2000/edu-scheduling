import React from "react";
import { CalendarDays } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="font-sans h-screen flex items-center justify-center p-4 md:p-8 bg-[#f9f9ff] overflow-hidden">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-[20px] h-full max-h-[900px]">
          <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 rounded-3xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] bg-[#d8e2ff] flex-col items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img alt="Product visual" className="w-full h-full object-cover opacity-20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7sd9U8Xm5H_4K9KAUVGNZxgf8cF1GMqroQG15_30X6Nhbqu1NWMan-H7L9q-UkJDYjNGnO9XljRf6xA61lCCN7Q6VF0YsQY7XIxKIvijO3aUN6Jft3-vwbY_UKDOR8HkmVOUko3Bts8ScCzoigX0LW_isJ2jFXKDSqPEbOqdBi8dOzqGWA0t5sj9QIQ5odODQKhWoya4AyqcSH5gGnjgiOLRatVpunZ13X4G26MNLp5U38FMFoaBe8W9pCA9cfccM8HJ5HkLb2ds" />
            </div>
            <div className="z-10 text-center mb-12">
              <h1 className="text-[48px] leading-[1.1] font-bold tracking-tight text-[#191b23] mb-4">EduSchedule</h1>
              <p className="text-[18px] leading-[1.6] text-[#424754] max-w-md mx-auto">Sắp xếp thời khóa biểu thông minh, giảm tải áp lực cho giáo viên và nhà trường.</p>
            </div>
            <div className="z-10 w-full max-w-lg rounded-3xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] p-8 bg-[#ffffff] flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#e1e2ec] pb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-6 w-6 text-[#005ac2]" />
                  <span className="text-[20px] leading-[1.4] font-bold text-[#191b23]">Lịch học tuần này</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#e1e2ec]"></div>
                  <div className="w-8 h-8 rounded-full bg-[#e1e2ec]"></div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-[12px] font-medium text-center text-[#727785]">T2</div>
                <div className="text-[12px] font-medium text-center text-[#727785]">T3</div>
                <div className="text-[12px] font-medium text-center text-[#727785]">T4</div>
                <div className="text-[12px] font-medium text-center text-[#727785]">T5</div>
                <div className="text-[12px] font-medium text-center text-[#727785]">T6</div>
                <div className="h-16 rounded-md bg-[#adc6ff]"></div>
                <div className="h-16 rounded-md bg-[#e1e2ec]"></div>
                <div className="h-16 rounded-md bg-[#adc6ff] border border-[#005ac2]"></div>
                <div className="h-16 rounded-md bg-[#e1e2ec]"></div>
                <div className="h-16 rounded-md bg-[#adc6ff]"></div>
                <div className="h-16 rounded-md bg-[#e1e2ec]"></div>
                <div className="h-16 rounded-md bg-[#adc6ff]"></div>
                <div className="h-16 rounded-md bg-[#e1e2ec]"></div>
                <div className="h-16 rounded-md bg-[#adc6ff] border border-[#005ac2]"></div>
                <div className="h-16 rounded-md bg-[#e1e2ec]"></div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 xl:w-2/5 rounded-3xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] bg-[#ffffff] flex flex-col justify-center px-8 md:px-16 py-12 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
