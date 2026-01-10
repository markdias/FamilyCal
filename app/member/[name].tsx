import { MemberDetailView } from '@/components/member/MemberDetailView';
import { useLocalSearchParams } from 'expo-router';

export default function MemberDetailScreen() {
  const params = useLocalSearchParams();
  const memberName = (params.name as string) || 'Member';

  return <MemberDetailView memberName={memberName} />;
}
