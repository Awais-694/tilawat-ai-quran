import { Metadata } from "next";
import { GuideClient } from "@/components/guide/GuideClient";

export const metadata: Metadata = {
  title: "مکمل رہنمائے صارف | Tilawat.Ai User Guide",
  description: "Tilawat.Ai ایپ کے تمام فیچرز، تلاوت اور استعمال کی مکمل اردو تصویری رہنمائی",
};

export default function GuidePage() {
  return <GuideClient />;
}
