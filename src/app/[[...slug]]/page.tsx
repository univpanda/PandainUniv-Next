import { ClientOnly } from './client'

export function generateStaticParams() {
  return [
    { slug: [''] },
    { slug: ['Admin'] },
    { slug: ['BuyData'] },
    { slug: ['Chat'] },
    { slug: ['Discussion'] },
    { slug: ['Notifications'] },
    { slug: ['Placements'] },
    { slug: ['Profile'] },
    { slug: ['Terms'] },
    { slug: ['UserManagement'] },
  ]
}

export default function Page() {
  return <ClientOnly />
}
