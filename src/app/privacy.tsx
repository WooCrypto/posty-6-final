// Privacy Policy Page
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
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
          <Text className="text-xl font-bold text-gray-900">Privacy Policy</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-gray-500 mb-6">Effective Date: February 2026</Text>

          <Section title="1. INFORMATION WE COLLECT">
            <Text className="text-gray-700 leading-6">
              We collect information only from parents or legal guardians, including:
              {'\n'}• Parent name and email
              {'\n'}• Billing and payment details
              {'\n'}• Child's first name or nickname (optional)
              {'\n'}• Child's age range (not exact birthdate)
              {'\n'}• Mailing address
              {'\n\n'}
              ⚠️ We do not require children's full names or sensitive personal details.
            </Text>
          </Section>

          <Section title="2. CHILDREN'S PRIVACY (COPPA COMPLIANCE)">
            <Text className="text-gray-700 leading-6">
              Magic Mail Club complies with the Children's Online Privacy Protection Act (COPPA).
              {'\n\n'}
              • We do not knowingly collect personal data directly from children under 13.
              {'\n'}• All information is provided and controlled by parents.
              {'\n'}• Parents may review, modify, or delete their child's information at any time.
            </Text>
          </Section>

          <Section title="3. HOW WE USE INFORMATION">
            <Text className="text-gray-700 leading-6">
              We use collected information to:
              {'\n'}• Process subscriptions and payments
              {'\n'}• Personalize mail content
              {'\n'}• Ship rewards and letters
              {'\n'}• Provide customer support
              {'\n'}• Improve our services
              {'\n\n'}
              We do not sell or rent personal information.
            </Text>
          </Section>

          <Section title="4. INFORMATION SHARING">
            <Text className="text-gray-700 leading-6">
              We only share information with:
              {'\n'}• Payment processors
              {'\n'}• Shipping carriers
              {'\n'}• Service providers necessary to operate the business
              {'\n\n'}
              All third parties are required to protect user data.
            </Text>
          </Section>

          <Section title="5. DATA SECURITY">
            <Text className="text-gray-700 leading-6">
              We implement reasonable safeguards to protect personal information, including:
              {'\n'}• Secure payment processing
              {'\n'}• Limited access to customer data
              {'\n'}• Industry-standard protections
              {'\n\n'}
              No system is 100% secure, but we take security seriously.
            </Text>
          </Section>

          <Section title="6. DATA RETENTION">
            <Text className="text-gray-700 leading-6">
              We retain personal information only as long as necessary to:
              {'\n'}• Provide services
              {'\n'}• Meet legal and accounting obligations
              {'\n'}• Resolve disputes
              {'\n\n'}
              Parents may request deletion at any time.
            </Text>
          </Section>

          <Section title="7. PARENTAL RIGHTS">
            <Text className="text-gray-700 leading-6">
              Parents have the right to:
              {'\n'}• Access their child's information
              {'\n'}• Correct inaccurate data
              {'\n'}• Request deletion
              {'\n'}• Withdraw consent
              {'\n\n'}
              Requests can be made through official Magic Mail Club support channels.
            </Text>
          </Section>

          <Section title="8. EMAIL & COMMUNICATIONS">
            <Text className="text-gray-700 leading-6">
              We may send:
              {'\n'}• Service-related emails
              {'\n'}• Subscription updates
              {'\n'}• Important notices
              {'\n\n'}
              Marketing emails will include an opt-out option.
            </Text>
          </Section>

          <Section title="9. CHANGES TO THIS POLICY">
            <Text className="text-gray-700 leading-6">
              We may update this Privacy Policy. Updates will be posted with a new effective date.
            </Text>
          </Section>

          <Section title="10. CONTACT INFORMATION">
            <Text className="text-gray-700 leading-6">
              For privacy or policy questions, parents may contact:
              {'\n\n'}
              Magic Mail Club Support
              {'\n'}MagicMailClub@gmail.com
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
