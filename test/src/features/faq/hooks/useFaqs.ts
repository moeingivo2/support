import { useQuery } from '@tanstack/react-query'
import { faqKeys, getFaqs } from '../services/faq-service'

export function useFaqs(category: string, search: string) {
  return useQuery({
    queryKey: faqKeys.list(category, search),
    queryFn: () => getFaqs({ category, search }),
  })
}
