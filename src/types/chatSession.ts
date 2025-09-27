export type ChatSession = {
    id: string;
    topic?: string | null;
    messages?: import("./message").Message[] | null;
};