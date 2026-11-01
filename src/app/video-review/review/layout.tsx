import { ReviewFrame } from "@/components/review/frame";

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <ReviewFrame>{children}</ReviewFrame>;
}
