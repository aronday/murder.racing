import Head from 'next/head'
import dynamic from 'next/dynamic'

const TopGearLeaderboard = dynamic(() => import('@/components/TopGearLeaderboard'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>Team MURDER Trials</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <TopGearLeaderboard
        proxyUrl="/api/laps"
        logoUrl="/murder-racing.png"
        logoAlt="Murder Racing"
      />
    </>
  )
}
