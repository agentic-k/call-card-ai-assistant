import { postFunction } from '@/lib/supabase/functionsClient'

/**
 * @param prospectLinkedinUrl - The linkedin profile data
 * @param prospectCompanyUrl - The linkedin company data
 * @returns The call pack JSON object
 */
export const createCallPack = (clientCompanyUrl: string, prospectLinkedinUrl: string, prospectCompanyUrl: string, callCardContext?: string) => 
    postFunction<any>('agent-api/create-call-pack', { clientCompanyUrl, prospectLinkedinUrl, prospectCompanyUrl, callCardContext })


/**
 * Analyzes the sales call transcript against the framework questions to determine which have been answered
 * @param framework - Name of the sales framework being used (e.g. 'MEDDIC', 'BANT')
 * @param questions - Array of framework questions
 * @param transcript - Current transcript of the sales call with speaker turns
 * @returns Analysis of which framework questions have been answered with evidence and confidence scores
 */
export const leadScoring = (framework: string, questions: string[], transcript: { turns: Array<{ speaker: string; text: string }> }) =>
    postFunction<any>('agent-api/lead-scoring', { 
        framework,
        questions,
        transcript
    })

