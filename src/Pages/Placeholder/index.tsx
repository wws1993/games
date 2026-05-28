import { PageLayout } from '../../components/layout/PageLayout';
import { Empty } from '../../components/ui';

interface PlaceholderPageProps {
  title: string;
  desc?: string;
}

export default function PlaceholderPage({ title, desc }: PlaceholderPageProps) {
  return (
    <PageLayout withTabBar={false}>
      <Empty description={desc ?? `${title}功能即将上线`} />
    </PageLayout>
  );
}
