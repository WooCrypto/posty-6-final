// Terms of Service Page
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={24} color="#1F2937" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Terms of Service</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-gray-500 mb-4">Effective Date: February 2026</Text>
          <Text className="text-gray-500 mb-6">Business Name: Magic Mail Club</Text>

          <Section title="1. OVERVIEW OF THE SERVICE">
            <Text className="text-gray-700 leading-6">
              Magic Mail Club is a subscription-based reward and motivation mail service designed for children. We send certificates, letters, printed rewards, small gifts, and optional gift cards through the mail to children whose parents or legal guardians enroll them.
              {'\n\n'}
              Magic Mail Club is intended to encourage:
              {'\n'}• Positive behavior
              {'\n'}• Academic effort
              {'\n'}• Creativity
              {'\n'}• Motivation and confidence
              {'\n\n'}
              Parents or legal guardians are the customers and decision-makers.
            </Text>
          </Section>

          <Section title="2. ELIGIBILITY & PARENTAL CONSENT">
            <Text className="text-gray-700 leading-6">
              Magic Mail Club is only available to children under the supervision of a parent or legal guardian.
              {'\n\n'}
              • A parent or legal guardian must create and manage the account.
              {'\n'}• By subscribing, the parent/guardian confirms they have legal authority to enroll the child and provide required information.
              {'\n'}• We do not knowingly accept subscriptions directly from children.
            </Text>
          </Section>

          <Section title="3. SUBSCRIPTIONS, BILLING & CANCELLATIONS">
            <Text className="text-gray-700 leading-6">
              • Subscriptions may be monthly or recurring, depending on the plan selected.
              {'\n'}• Payments are processed through third-party payment processors.
              {'\n'}• Subscriptions automatically renew unless canceled.
              {'\n'}• Parents may cancel at any time through the designated cancellation method.
              {'\n'}• No refunds are guaranteed for mailed items already processed or shipped.
              {'\n'}• We reserve the right to modify pricing, plans, or offerings with advance notice.
            </Text>
          </Section>

          <Section title="4. MAIL CONTENT & SAFETY STANDARDS">
            <Text className="text-gray-700 leading-6 font-semibold mb-2">
              Magic Mail Club commits to child-safe standards:
            </Text>
            <Text className="text-gray-700 leading-6">
              What We May Send:
              {'\n'}• Certificates and printed rewards
              {'\n'}• Letters of encouragement
              {'\n'}• Stickers, paper items, or lightweight keepsakes
              {'\n'}• Gift cards (digital or physical, where applicable)
              {'\n\n'}
              What We Do NOT Send:
              {'\n'}• Food, candy, or edible items unless explicitly stated and parent-approved
              {'\n'}• Hazardous, sharp, or choking-hazard items
              {'\n'}• Electronics with batteries
              {'\n'}• Anything age-inappropriate, explicit, or harmful
              {'\n\n'}
              All mailed content is age-appropriate, non-violent, and non-sexual.
            </Text>
          </Section>

          <Section title="5. PARENT RESPONSIBILITY & SUPERVISION">
            <Text className="text-gray-700 leading-6">
              Parents acknowledge that:
              {'\n'}• Mail should be opened and reviewed by a parent or guardian, especially for children under 13.
              {'\n'}• Magic Mail Club is not responsible for misuse of mailed items.
              {'\n'}• Parents determine whether mailed items are suitable for their child.
            </Text>
          </Section>

          <Section title="6. SHIPPING & DELIVERY">
            <Text className="text-gray-700 leading-6">
              • Shipping times are estimates and not guaranteed.
              {'\n'}• We are not responsible for delays caused by USPS or third-party carriers.
              {'\n'}• Incorrect addresses provided by the customer are the customer's responsibility.
            </Text>
          </Section>

          <Section title="7. INTELLECTUAL PROPERTY">
            <Text className="text-gray-700 leading-6">
              All designs, certificates, branding, logos, characters, and written content are the exclusive property of Magic Mail Club.
              {'\n\n'}
              You may not:
              {'\n'}• Copy
              {'\n'}• Resell
              {'\n'}• Redistribute
              {'\n'}• Reproduce our materials without written permission
            </Text>
          </Section>

          <Section title="8. TERMINATION OF SERVICE">
            <Text className="text-gray-700 leading-6">
              We reserve the right to:
              {'\n'}• Refuse service
              {'\n'}• Suspend or terminate accounts
              {'\n'}• Cancel subscriptions
              {'\n\n'}
              If misuse, fraud, or policy violations occur.
            </Text>
          </Section>

          <Section title="9. LIMITATION OF LIABILITY">
            <Text className="text-gray-700 leading-6">
              To the fullest extent permitted by law:
              {'\n'}• Magic Mail Club is not liable for indirect, incidental, or consequential damages.
              {'\n'}• Liability is limited to the amount paid for the subscription during the applicable billing period.
            </Text>
          </Section>

          <Section title="10. GOVERNING LAW">
            <Text className="text-gray-700 leading-6">
              These Terms are governed by the laws of the United States and the State in which Magic Mail Club is registered, without regard to conflict-of-law principles.
            </Text>
          </Section>

          <Section title="11. CHANGES TO TERMS">
            <Text className="text-gray-700 leading-6">
              We may update these Terms from time to time. Continued use of the service constitutes acceptance of updated terms.
            </Text>
          </Section>

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-gray-900 mb-2">{title}</Text>
      {children}
    </View>
  );
}
