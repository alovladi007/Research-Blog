import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (in development only!)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🗑️  Cleaning existing data...')
    await prisma.bookmark.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.message.deleteMany()
    await prisma.chatRoom.deleteMany()
    await prisma.reaction.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.attachment.deleteMany()
    await prisma.review.deleteMany()
    await prisma.paper.deleteMany()
    await prisma.post.deleteMany()
    await prisma.projectMember.deleteMany()
    await prisma.project.deleteMany()
    await prisma.groupMember.deleteMany()
    await prisma.group.deleteMany()
    await prisma.follow.deleteMany()
    await prisma.user.deleteMany()
  }

  // Create users
  console.log('👥 Creating users...')
  const password = await hashPassword('password123')

  const users = await Promise.all([
    // Professors
    prisma.user.create({
      data: {
        email: 'alice.johnson@mit.edu',
        password,
        name: 'Dr. Alice Johnson',
        role: 'PROFESSOR',
        institution: 'MIT',
        department: 'Computer Science',
        bio: 'Professor of AI and Machine Learning with 15+ years of research experience',
        researchInterests: ['Artificial Intelligence', 'Machine Learning', 'Neural Networks'],
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob.smith@stanford.edu',
        password,
        name: 'Prof. Bob Smith',
        role: 'PROFESSOR',
        institution: 'Stanford University',
        department: 'Physics',
        bio: 'Quantum physics researcher and educator',
        researchInterests: ['Quantum Physics', 'Quantum Computing', 'Theoretical Physics'],
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        avatar: 'https://i.pravatar.cc/150?img=2',
      },
    }),
    // Researchers
    prisma.user.create({
      data: {
        email: 'carol.white@openai.com',
        password,
        name: 'Dr. Carol White',
        role: 'RESEARCHER',
        institution: 'OpenAI',
        department: 'Research',
        bio: 'AI Safety researcher focusing on alignment problems',
        researchInterests: ['AI Safety', 'Reinforcement Learning', 'Ethics'],
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        avatar: 'https://i.pravatar.cc/150?img=3',
      },
    }),
    prisma.user.create({
      data: {
        email: 'david.chen@google.com',
        password,
        name: 'David Chen',
        role: 'RESEARCHER',
        institution: 'Google Research',
        department: 'DeepMind',
        bio: 'Deep learning researcher specializing in computer vision',
        researchInterests: ['Computer Vision', 'Deep Learning', 'Image Recognition'],
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        avatar: 'https://i.pravatar.cc/150?img=4',
      },
    }),
    // Students
    prisma.user.create({
      data: {
        email: 'emma.davis@berkeley.edu',
        password,
        name: 'Emma Davis',
        role: 'STUDENT',
        institution: 'UC Berkeley',
        department: 'Data Science',
        bio: 'PhD student researching natural language processing',
        researchInterests: ['NLP', 'Transformers', 'Language Models'],
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        avatar: 'https://i.pravatar.cc/150?img=5',
      },
    }),
    prisma.user.create({
      data: {
        email: 'frank.miller@harvard.edu',
        password,
        name: 'Frank Miller',
        role: 'STUDENT',
        institution: 'Harvard University',
        department: 'Biomedical Engineering',
        bio: 'Master's student in computational biology',
        researchInterests: ['Bioinformatics', 'Genomics', 'Machine Learning'],
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        avatar: 'https://i.pravatar.cc/150?img=6',
      },
    }),
  ])

  console.log(`✅ Created ${users.length} users`)

  // Create follows
  console.log('🤝 Creating follows...')
  await prisma.follow.createMany({
    data: [
      { followerId: users[4].id, followingId: users[0].id }, // Emma follows Alice
      { followerId: users[4].id, followingId: users[2].id }, // Emma follows Carol
      { followerId: users[5].id, followingId: users[1].id }, // Frank follows Bob
      { followerId: users[5].id, followingId: users[3].id }, // Frank follows David
      { followerId: users[2].id, followingId: users[0].id }, // Carol follows Alice
      { followerId: users[3].id, followingId: users[1].id }, // David follows Bob
    ],
  })

  // Create groups
  console.log('👥 Creating groups...')
  const groups = await Promise.all([
    prisma.group.create({
      data: {
        name: 'AI Research Lab',
        description: 'Collaborative research group for artificial intelligence and machine learning',
        isPrivate: false,
        members: {
          create: [
            { userId: users[0].id, role: 'ADMIN' },
            { userId: users[2].id, role: 'MODERATOR' },
            { userId: users[4].id, role: 'MEMBER' },
          ],
        },
      },
    }),
    prisma.group.create({
      data: {
        name: 'Quantum Computing Consortium',
        description: 'Exploring the frontiers of quantum computing and its applications',
        isPrivate: false,
        members: {
          create: [
            { userId: users[1].id, role: 'ADMIN' },
            { userId: users[3].id, role: 'MEMBER' },
          ],
        },
      },
    }),
  ])

  console.log(`✅ Created ${groups.length} groups`)

  // Create projects
  console.log('📁 Creating projects...')
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        title: 'Large Language Model Safety Research',
        description: 'Research project focused on alignment and safety in large language models',
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        members: {
          create: [
            { userId: users[0].id, role: 'LEAD' },
            { userId: users[2].id, role: 'MEMBER' },
            { userId: users[4].id, role: 'MEMBER' },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        title: 'Quantum Error Correction',
        description: 'Developing new algorithms for quantum error correction',
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        members: {
          create: [
            { userId: users[1].id, role: 'LEAD' },
            { userId: users[3].id, role: 'ADVISOR' },
          ],
        },
      },
    }),
  ])

  console.log(`✅ Created ${projects.length} projects`)

  // Create posts
  console.log('📝 Creating posts...')
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: 'Introduction to Transformer Architecture',
        content: 'The Transformer architecture has revolutionized NLP. Let me explain the key concepts:\n\n1. Self-attention mechanism\n2. Multi-head attention\n3. Positional encoding\n\nThe attention mechanism allows the model to weigh different parts of the input sequence differently.',
        type: 'ARTICLE',
        authorId: users[0].id,
        tags: ['AI', 'NLP', 'Transformers', 'Deep Learning'],
        published: true,
        latex: false,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Quantum Entanglement Explained',
        content: 'Quantum entanglement is one of the most fascinating phenomena in quantum mechanics. When two particles become entangled, measuring one instantly affects the other, regardless of distance.\n\nThis has profound implications for quantum computing and quantum cryptography.',
        type: 'ARTICLE',
        authorId: users[1].id,
        groupId: groups[1].id,
        tags: ['Quantum Physics', 'Entanglement', 'Quantum Computing'],
        published: true,
        latex: true,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Question: Best practices for fine-tuning LLMs?',
        content: 'I\'m working on fine-tuning GPT models for domain-specific tasks. What are the best practices for:\n\n- Dataset preparation\n- Hyperparameter tuning\n- Avoiding catastrophic forgetting\n\nAny recommendations would be appreciated!',
        type: 'QUESTION',
        authorId: users[4].id,
        groupId: groups[0].id,
        tags: ['LLM', 'Fine-tuning', 'Question'],
        published: true,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Breakthrough in Quantum Error Correction',
        content: 'Our team has developed a new surface code approach that reduces error rates by 40%. This could be a game-changer for scalable quantum computers.',
        type: 'ANNOUNCEMENT',
        authorId: users[1].id,
        projectId: projects[1].id,
        tags: ['Quantum Computing', 'Error Correction', 'Breakthrough'],
        published: true,
      },
    }),
  ])

  console.log(`✅ Created ${posts.length} posts`)

  // Create comments
  console.log('💬 Creating comments...')
  await prisma.comment.createMany({
    data: [
      {
        content: 'Great explanation! The self-attention mechanism is truly revolutionary.',
        postId: posts[0].id,
        authorId: users[2].id,
      },
      {
        content: 'Could you elaborate on the positional encoding part? I\'m still confused about how it works.',
        postId: posts[0].id,
        authorId: users[4].id,
      },
      {
        content: 'For fine-tuning, I recommend starting with a smaller learning rate (1e-5) and using LoRA for parameter-efficient tuning.',
        postId: posts[2].id,
        authorId: users[0].id,
      },
      {
        content: 'This is incredible! How does this compare to other error correction methods?',
        postId: posts[3].id,
        authorId: users[3].id,
      },
    ],
  })

  // Create reactions
  console.log('👍 Creating reactions...')
  await prisma.reaction.createMany({
    data: [
      { type: 'LIKE', postId: posts[0].id, userId: users[2].id },
      { type: 'INSIGHTFUL', postId: posts[0].id, userId: users[4].id },
      { type: 'HELPFUL', postId: posts[2].id, userId: users[0].id },
      { type: 'CELEBRATE', postId: posts[3].id, userId: users[3].id },
      { type: 'LIKE', postId: posts[1].id, userId: users[3].id },
    ],
  })

  // Create papers
  console.log('📄 Creating papers...')
  const papers = await Promise.all([
    prisma.paper.create({
      data: {
        title: 'Attention Is All You Need',
        abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
        doi: '10.48550/arXiv.1706.03762',
        arxivId: '1706.03762',
        publishedDate: new Date('2017-06-12'),
        journal: 'NeurIPS',
        citations: 89234,
        authors: {
          connect: [{ id: users[0].id }],
        },
        projectId: projects[0].id,
      },
    }),
    prisma.paper.create({
      data: {
        title: 'Quantum Error Correction for Beginners',
        abstract: 'An introduction to quantum error correction codes and their applications in quantum computing.',
        arxivId: '0905.2794',
        publishedDate: new Date('2009-05-18'),
        conference: 'Quantum Information Processing',
        citations: 1543,
        authors: {
          connect: [{ id: users[1].id }],
        },
        projectId: projects[1].id,
      },
    }),
  ])

  console.log(`✅ Created ${papers.length} papers`)

  // Create reviews
  console.log('⭐ Creating reviews...')
  await prisma.review.createMany({
    data: [
      {
        content: 'Groundbreaking work that changed the field of NLP forever. The architecture is elegant and effective.',
        rating: 5,
        paperId: papers[0].id,
        reviewerId: users[2].id,
        isPublic: true,
      },
      {
        content: 'Excellent introduction to quantum error correction. Very accessible for beginners.',
        rating: 4,
        paperId: papers[1].id,
        reviewerId: users[3].id,
        isPublic: true,
      },
    ],
  })

  // Create notifications
  console.log('🔔 Creating notifications...')
  await prisma.notification.createMany({
    data: [
      {
        type: 'FOLLOW',
        content: 'Emma Davis started following you',
        userId: users[0].id,
        relatedId: users[4].id,
      },
      {
        type: 'LIKE',
        content: 'Dr. Carol White liked your post',
        userId: users[0].id,
        relatedId: posts[0].id,
      },
      {
        type: 'COMMENT',
        content: 'Emma Davis commented on your post',
        userId: users[0].id,
        relatedId: posts[0].id,
      },
    ],
  })

  console.log('✅ Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`  Users: ${users.length}`)
  console.log(`  Groups: ${groups.length}`)
  console.log(`  Projects: ${projects.length}`)
  console.log(`  Posts: ${posts.length}`)
  console.log(`  Papers: ${papers.length}`)
  console.log('\n🔑 Login credentials:')
  console.log('  Email: alice.johnson@mit.edu')
  console.log('  Password: password123')
  console.log('  (All users have the same password for testing)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
