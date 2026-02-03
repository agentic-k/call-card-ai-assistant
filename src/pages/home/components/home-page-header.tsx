interface HomePageHeaderProps {
  title: string;
  description: string;
}

const HomePageHeader = ({ title, description }: HomePageHeaderProps) => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default HomePageHeader; 