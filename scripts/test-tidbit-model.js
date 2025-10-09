#!/usr/bin/env node

/**
 * Test Tidbit Model
 *
 * Quick test to verify the tidbit synthesizer is using the correct model
 * and can generate tidbits with RAG context.
 *
 * @fileoverview Model verification test
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { TidbitSynthesizer } from '../source/server/processors/tidbit-synthesizer.js';
import { getModelConfig } from '../source/server/config/models.js';

async function testTidbitModel() {
  console.log('🧪 Testing Tidbit Model Configuration...\n');

  // Test 1: Check model config loading
  console.log('1. Testing model configuration:');
  const modelConfig = getModelConfig('tidbitSynthesis');
  console.log(`   Model: ${modelConfig.model}`);
  console.log(`   Expected: z-ai/glm-4.5-air:free`);
  console.log(
    `   Match: ${modelConfig.model === 'z-ai/glm-4.5-air:free' ? '✅' : '❌'}\n`
  );

  // Test 2: Initialize tidbit synthesizer
  console.log('2. Initializing Tidbit Synthesizer...');
  const synthesizer = new TidbitSynthesizer({
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openRouterModelId: process.env.OPENROUTER_MODEL_ID,
    mockMode: false,
  });
  console.log('   ✅ Synthesizer initialized\n');

  // Test 3: Test RAG context loading
  console.log('3. Testing RAG context loading...');
  const ragContext = await synthesizer.loadRagContext('bulbasaur');
  console.log(`   Sources used: ${ragContext.sourcesUsed.join(', ')}`);
  console.log(`   Relevant pages: ${ragContext.relevantPages}`);
  console.log(`   Context length: ${ragContext.contextWindow.length} chars`);
  console.log(`   ✅ RAG context loaded\n`);

  // Test 4: Test basic tidbit generation (with small mock data to avoid API costs)
  console.log('4. Testing tidbit generation with mock data...');
  try {
    const mockSpeciesData =
      'Name: Bulbasaur\nType: Grass/Poison\nAbilities: Overgrow\nDescription: A small, quadrupedal Pokémon that has a plant bulb on its back.';
    const mockForumData =
      'Bulbasaur is great for beginners. It evolves early and has good defensive stats.';

    // Temporarily switch to mock mode for this test
    synthesizer.config.mockMode = true;
    const tidbits = await synthesizer.generateTidbits(
      mockSpeciesData,
      mockForumData,
      'bulbasaur'
    );
    synthesizer.config.mockMode = false;

    console.log(`   Generated ${tidbits.length} mock tidbits`);
    if (tidbits.length > 0) {
      console.log(`   Sample tidbit: "${tidbits[0].title}"`);
    }
    console.log('   ✅ Mock generation works\n');
  } catch (error) {
    console.log(`   ❌ Mock generation failed: ${error.message}\n`);
  }

  // Test 5: Verify API connectivity (without making expensive calls)
  console.log('5. Testing API connectivity...');
  try {
    const response = await synthesizer.client.get('/models');
    console.log('   ✅ OpenRouter API accessible');
    console.log(
      `   Available models: ${response.data.data?.length || 'unknown'}\n`
    );
  } catch (error) {
    console.log(`   ⚠️  API connectivity issue: ${error.message}\n`);
  }

  console.log('🎉 Tidbit model test complete!');
  console.log('\n📋 Summary:');
  console.log(
    `   - Model: ${modelConfig.model === 'z-ai/glm-4.5-air:free' ? '✅ Correct' : '❌ Wrong'}`
  );
  console.log(
    `   - RAG Context: ${ragContext.totalContentLength > 0 ? '✅ Available' : '❌ Missing'}`
  );
  console.log(`   - Synthesizer: ✅ Initialized`);
  console.log(
    `   - API Access: ${process.env.OPENROUTER_API_KEY ? '✅ Key present' : '❌ No key'}`
  );
}

testTidbitModel().catch(console.error);
