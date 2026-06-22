import { AppLayout } from '@/components/Layout/AppLayout'

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLayout teamName="Football Team">
      {children}
    </AppLayout>
  )
}
