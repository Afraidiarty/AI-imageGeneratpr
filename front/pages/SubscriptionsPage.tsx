"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { loadStripe } from "@stripe/stripe-js"
import Header from "../components/Header"
import Spinner from "../components/Spinner"
import { useAuth } from "../contexts/AuthContext"
import { apiRequest } from "../services/apiClient"
import type { BillingPlan, CreditPack } from "../types"

interface PlansResponse {
  publishableKey: string
  monthlyPlan: BillingPlan
  creditPacks: CreditPack[]
}

interface CheckoutResponse {
  id: string
  url?: string
}

const SubscriptionsPage: React.FC = () => {
  const { token, subscription, refreshProfile } = useAuth()
  const [plans, setPlans] = useState<PlansResponse | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "action">("idle")
  const [error, setError] = useState<string | null>(null)

  const stripePromise = useMemo(() => {
    if (!plans?.publishableKey) {
      return null
    }
    return loadStripe(plans.publishableKey)
  }, [plans?.publishableKey])

  useEffect(() => {
    const load = async () => {
      setStatus("loading")
      try {
        const response = await apiRequest<PlansResponse>("/billing/plans")
        setPlans(response)
        setError(null)
      } catch (err) {
        console.error(err)
        setError("Не удалось загрузить тарифы.")
      } finally {
        setStatus("idle")
      }
    }
    load()
  }, [])

  const redirectThroughStripe = async (session: CheckoutResponse) => {
    try {
      if (session.url) {
        window.location.href = session.url
        return
      }
      setError("Ошибка: отсутствует ссылка для оплаты Stripe.")
    } catch (error) {
      console.error("Stripe redirect error:", error)
      setError("Ошибка перенаправления в Stripe.")
    }
  }

  const handleStartSubscription = async () => {
    if (!token) return
    setStatus("action")
    try {
      const session = await apiRequest<CheckoutResponse>("/billing/subscription/checkout", {
        method: "POST",
        token,
      })
      await redirectThroughStripe(session)
      setStatus("idle")
    } catch (err) {
      console.error(err)
      setError("Не удалось создать сессию оплаты.")
      setStatus("idle")
    }
  }

  const handleBuyPack = async (packId: string) => {
    if (!token) return
    setStatus("action")
    try {
      const session = await apiRequest<CheckoutResponse>("/billing/credits/checkout", {
        method: "POST",
        body: JSON.stringify({ packId }),
        token,
      })
      await redirectThroughStripe(session)
      setStatus("idle")
    } catch (err) {
      console.error(err)
      setError("Не удалось начать оплату пакета кредитов.")
      setStatus("idle")
    }
  }

  const handleCancelSubscription = async () => {
    if (!token) return
    setStatus("action")
    try {
      await apiRequest("/billing/subscription/cancel", {
        method: "POST",
        token,
      })
      await refreshProfile()
    } catch (err) {
      console.error(err)
      setError("Не удалось отменить подписку.")
    } finally {
      setStatus("idle")
    }
  }

  const isBusy = status !== "idle"

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header Section */}
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">Подписка и кредиты</h1>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto mb-4">
            Выберите подходящий тариф и управляйте балансом кредитов
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 font-semibold transition-colors"
          >
            <span>&larr;</span>
            <span>Вернуться в студию</span>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 max-w-3xl mx-auto bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Loading State */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Spinner />
            <span className="text-neutral-400">Загружаем тарифы...</span>
          </div>
        )}

        {/* Plans Content */}
        {plans && (
          <div className="space-y-8 sm:space-y-12">
            {/* Monthly Subscription Section */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">Ежемесячная подписка</h2>
              <div className="max-w-2xl mx-auto">
                <div className="relative rounded-2xl border-2 border-orange-500/30 bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] p-6 sm:p-8 shadow-2xl overflow-hidden">
                  {/* Decorative gradient overlay */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -z-10"></div>

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                    {/* Plan Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl sm:text-3xl font-bold text-white">{plans.monthlyPlan.name}</h3>
                        <span className="px-3 py-1 text-xs font-semibold bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                          Популярный
                        </span>
                      </div>
                      <p className="text-neutral-300 mb-4 text-sm sm:text-base">{plans.monthlyPlan.description}</p>

                      {/* Features List */}
                      <ul className="space-y-2.5 mb-6">
                        <li className="flex items-start gap-3 text-neutral-200">
                          <span className="text-orange-400 mt-0.5">✓</span>
                          <span className="text-sm sm:text-base">
                            <strong>{plans.monthlyPlan.includedCredits}</strong> кредитов каждый месяц
                          </span>
                        </li>
                        <li className="flex items-start gap-3 text-neutral-200">
                          <span className="text-orange-400 mt-0.5">✓</span>
                          <span className="text-sm sm:text-base">Приоритетная генерация сцен</span>
                        </li>
                        <li className="flex items-start gap-3 text-neutral-200">
                          <span className="text-orange-400 mt-0.5">✓</span>
                          <span className="text-sm sm:text-base">Автоматическое продление</span>
                        </li>
                        <li className="flex items-start gap-3 text-neutral-200">
                          <span className="text-orange-400 mt-0.5">✓</span>
                          <span className="text-sm sm:text-base">Поддержка через Stripe</span>
                        </li>
                      </ul>
                    </div>

                    {/* Price & Action */}
                    <div className="sm:text-right flex-shrink-0">
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2 sm:justify-end">
                          <span className="text-4xl sm:text-5xl font-bold text-white">
                            {(plans.monthlyPlan.price / 100).toFixed(0)}
                          </span>
                          <span className="text-xl text-neutral-400">₽</span>
                        </div>
                        <p className="text-sm text-neutral-400 mt-1">в месяц</p>
                      </div>

                      {subscription ? (
                        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4 text-sm space-y-2">
                          <div className="flex items-center gap-2 justify-center sm:justify-end">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <p className="text-white font-semibold">
                              {subscription.status === "active" ? "Активна" : subscription.status}
                            </p>
                          </div>
                          {subscription.currentPeriodEnd && (
                            <p className="text-neutral-400 text-xs">
                              До {new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU")}
                            </p>
                          )}
                          {subscription.cancelAtPeriodEnd ? (
                            <p className="text-yellow-400 text-xs mt-2">Автопродление отключено</p>
                          ) : (
                            <button
                              className="mt-2 w-full rounded-lg border border-red-500/50 px-4 py-2 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
                              onClick={handleCancelSubscription}
                              disabled={isBusy}
                            >
                              Отменить
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleStartSubscription}
                          disabled={isBusy}
                          className="w-full sm:w-auto min-w-[200px] rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-3.5 px-6 font-bold text-white hover:from-orange-700 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-orange-500/25 transition-all"
                        >
                          {isBusy ? "Загрузка..." : "Оформить подписку"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Credit Packs Section */}
            <section>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Пакеты кредитов</h2>
                <p className="text-neutral-400 text-sm sm:text-base">
                  Докупите кредиты в любой момент для продолжения работы
                </p>
              </div>

              {plans.creditPacks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-500">Пакеты кредитов ещё не настроены</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                  {plans.creditPacks.map((pack, index) => (
                    <div
                      key={pack.id}
                      className="group relative rounded-xl border border-neutral-800 bg-[#1C1C1E] p-6 shadow-lg hover:border-orange-500/50 hover:shadow-orange-500/10 transition-all duration-300"
                    >
                      {/* Best Value Badge for middle pack */}
                      {plans.creditPacks.length === 3 && index === 1 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 text-xs font-bold bg-orange-500 text-white rounded-full shadow-lg">
                            Выгодно
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-white mb-1">{pack.name}</h3>
                        <p className="text-sm text-neutral-400 mb-4">{pack.description}</p>

                        {/* Credits Display */}
                        <div className="inline-flex items-baseline gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 mb-4">
                          <span className="text-3xl font-bold text-orange-400">{pack.credits}</span>
                          <span className="text-sm text-neutral-400">кредитов</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-center mb-4">
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-3xl font-bold text-white">{(pack.price / 100).toFixed(0)}</span>
                          <span className="text-lg text-neutral-400">₽</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {(pack.price / pack.credits / 100).toFixed(2)} ₽ за кредит
                        </p>
                      </div>

                      {/* Buy Button */}
                      <button
                        onClick={() => handleBuyPack(pack.id)}
                        disabled={isBusy}
                        className="w-full rounded-lg bg-neutral-800 px-4 py-3 text-sm font-semibold text-orange-400 hover:bg-neutral-700 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-60 transition-all group-hover:bg-orange-500/10"
                      >
                        {isBusy ? "Загрузка..." : "Купить пакет"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default SubscriptionsPage
